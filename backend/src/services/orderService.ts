import crypto from 'crypto';
import type { Order, OrderItem, Product } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';
import { consumeVoucher, releaseOrderVouchers, validateVouchers } from './voucherService';
import type { AppliedVoucherResult } from './voucherService';
import { getSettings } from './settingsService';
import { env } from '../config/env';
import { sendOrderConfirmationEmail } from './emailService';
import { toClientOrder } from '../helpers/orderMapper';

type CreateOrderItemInput = {
  productId: string;
  quantity: number;
  variant?: string | null;
};

type CustomerInfoInput = {
  fullName?: string;
  email?: string | null;
  phone?: string;
  address?: string;
};

type CreateOrderInput = {
  items: CreateOrderItemInput[];
  customerInfo: CustomerInfoInput;
  /** Nhiều mã giảm giá áp cùng lúc (tối đa 5). */
  voucherCodes?: string[];
  /** Tương thích bản cũ: một mã duy nhất. */
  voucherCode?: string;
  note?: string | null;
  paymentMethod?: string;
};

type OrderWithItems = Order & { items: OrderItem[] };

const generateOrderCode = (): string => 'DH' + crypto.randomBytes(8).toString('hex').toUpperCase();

const matchesGuestToken = (providedToken: string, storedToken: string | null): boolean => {
  const supplied = Buffer.from(providedToken || '');
  const expected = Buffer.from(storedToken || '');
  return supplied.length > 0 && supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};

export const createOrder = async ({ items, customerInfo, voucherCodes, voucherCode, note, paymentMethod = 'cod' }: CreateOrderInput, userId?: string | null) => {
  if (!Array.isArray(items) || items.length === 0) throw ApiError.badRequest('Giỏ hàng đang trống');
  for (const item of items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw ApiError.badRequest('Sản phẩm hoặc số lượng trong giỏ hàng không hợp lệ');
    }
  }
  const settings = await getSettings();
  const enabledMethods: Record<string, boolean> = {
    cod: settings.enableCod,
    bank_transfer: settings.enableBankTransfer && Boolean(settings.bankName.trim() && settings.bankAccount.trim() && settings.bankAccountName.trim()),
    // Chế độ mock (demo): dùng cổng giả lập nên không cần khoá merchant; chế độ live: bắt buộc có khoá
    momo: settings.enableMomo && (env.payment.mode === 'mock' || Boolean(env.momo.partnerCode && env.momo.accessKey && env.momo.secretKey)),
    vnpay: settings.enableVnpay && (env.payment.mode === 'mock' || Boolean(env.vnpay.tmnCode && env.vnpay.hashSecret)),
  };
  if (!Object.prototype.hasOwnProperty.call(enabledMethods, paymentMethod) || !enabledMethods[paymentMethod]) {
    throw ApiError.badRequest('Phương thức thanh toán này hiện chưa được cửa hàng hỗ trợ');
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  const productMap = new Map(products.map((p: Product) => [p.id, p]));

  // Validate sản phẩm tồn tại & build order items
  let totalAmount = 0;
  const orderItems: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw ApiError.notFound('Sản phẩm không tồn tại hoặc đã bị ẩn');
    if (!(product.price > 0)) {
      throw ApiError.badRequest(`Sản phẩm "${product.name}" chưa có giá, vui lòng liên hệ cửa hàng để được báo giá`);
    }
    if (!Number.isSafeInteger(product.price)) {
      throw ApiError.badRequest(`Giá sản phẩm "${product.name}" phải là số nguyên VND hợp lệ`);
    }
    orderItems.push({
      productId: product.id,
      name: product.name,
      image: product.images.length > 0 ? product.images[0] : '',
      price: product.price,
      quantity: item.quantity,
      variant: item.variant || '',
    });
    totalAmount += product.price * item.quantity;
    if (!Number.isSafeInteger(totalAmount)) throw ApiError.badRequest('Tổng tiền đơn hàng vượt giới hạn hợp lệ');
  }

  // Shipping policy and voucher discount are calculated exclusively on the server.
  let shippingFee = totalAmount >= settings.freeShippingFrom ? 0 : settings.defaultShippingFee;
  let discount = 0;
  let appliedVouchers: AppliedVoucherResult[] = [];
  const requestedCodes = Array.isArray(voucherCodes) && voucherCodes.length > 0
    ? voucherCodes
    : voucherCode ? [voucherCode] : [];
  if (requestedCodes.length > 0) {
    const voucherResult = await validateVouchers(requestedCodes, totalAmount, shippingFee);
    if (!voucherResult.valid) throw ApiError.badRequest(voucherResult.error);
    appliedVouchers = voucherResult.vouchers;
    discount = voucherResult.discountAmount;
    if (voucherResult.freeShip) shippingFee = 0;
  }

  const finalAmount = Math.max(0, totalAmount + shippingFee - discount);
  if (!Number.isSafeInteger(finalAmount)) throw ApiError.badRequest('Tổng thanh toán phải là số nguyên VND hợp lệ');
  const guestAccessToken = userId ? null : crypto.randomBytes(32).toString('hex');

  // ✅ FIX: Interactive transaction — throw bên trong để tự rollback tất cả khi hết hàng
  let order: OrderWithItems;
  try {
    order = await prisma.$transaction(async (tx) => {
      // Reserve voucher usage in the same transaction as stock and order creation.
      for (const voucher of appliedVouchers) await consumeVoucher(tx, voucher.voucherId);

      // Trừ stock từng sản phẩm, throw ngay nếu không đủ → toàn bộ rollback
      for (const item of items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: {
            stock: { decrement: item.quantity },
            sold:  { increment: item.quantity },
          },
        });

        if (result.count === 0) {
          // Đọc stock thực để thông báo chính xác
          const current = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, name: true },
          });
          const msg = (current?.stock ?? 0) === 0
            ? `Sản phẩm "${current?.name}" đã hết hàng`
            : `Sản phẩm "${current?.name}" chỉ còn ${current?.stock} cái`;
          throw new Error(`STOCK_FAIL:${msg}`);
        }
      }

      // Tạo đơn hàng — chỉ chạy nếu toàn bộ stock OK
      return tx.order.create({
        data: {
          orderCode: generateOrderCode(),
          userId: userId || null,
          customerFullName: customerInfo.fullName || '',
          customerEmail: customerInfo.email || null,
          customerPhone: customerInfo.phone || '',
          customerAddress: customerInfo.address || '',
          items: { create: orderItems },
          totalAmount,
          shippingFee: Number(shippingFee),
          discount,
          finalAmount,
          paymentMethod,
          note,
          guestAccessToken,
          // voucherId giữ mã đầu tiên (quan hệ DB); voucherCode lưu đủ danh sách mã, ngăn cách bằng dấu phẩy
          voucherId: appliedVouchers[0]?.voucherId ?? null,
          voucherCode: appliedVouchers.length > 0 ? appliedVouchers.map((v) => v.code).join(',') : null,
        },
        include: { items: true },
      });
    });
  } catch (err: unknown) {
    // Phân biệt lỗi stock (do mình throw) vs lỗi DB khác
    if (err instanceof Error && err.message.startsWith('STOCK_FAIL:')) {
      throw ApiError.badRequest(err.message.replace('STOCK_FAIL:', ''));
    }
    throw err;
  }

  // Gửi email xác nhận (fire-and-forget, không block response)
  if (customerInfo.email) {
    sendOrderConfirmationEmail({
      to: customerInfo.email,
      fullName: customerInfo.fullName ?? '',
      orderCode: order.orderCode,
      items: order.items,
      finalAmount: order.finalAmount,
      paymentMethod: order.paymentMethod,
    }).catch((err: unknown) =>
      console.error('Order email failed:', err instanceof Error ? err.message : String(err))
    );
  }

  return toClientOrder(order);
};

export const getMyOrders = async (userId: string) => {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  return orders.map((o) => toClientOrder(o));
};

export const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return order;
  return toClientOrder(order);
};

/**
 * Hoàn lại tồn kho khi đơn bị huỷ (đã bị trừ lúc đặt hàng).
 * Dùng chung cho khách tự huỷ và admin huỷ.
 */
export const restockOrderItems = async (
  tx: Prisma.TransactionClient,
  items: { productId: string | null; quantity: number | null }[]
): Promise<void> => {
  for (const item of items) {
    const qty = item.quantity ?? 0;
    if (!item.productId || qty <= 0) continue;
    const withSold = await tx.product.updateMany({
      where: { id: item.productId, sold: { gte: qty } },
      data: { stock: { increment: qty }, sold: { decrement: qty } },
    });
    if (withSold.count === 0) {
      // Keep stock correct without allowing a legacy/inconsistent sold counter to go negative.
      await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: qty } } });
    }
  }
};

/**
 * Khách tự huỷ đơn của mình.
 * Điều kiện: là chủ đơn, đơn còn "Chờ xác nhận" (pending) và chưa thanh toán online.
 */
export const cancelMyOrder = async (orderId: string, userId: string, reason?: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng');
  if (!order.userId || order.userId !== userId) {
    throw ApiError.forbidden('Bạn không có quyền huỷ đơn hàng này');
  }
  if (order.status === 'cancelled') throw ApiError.badRequest('Đơn hàng này đã được huỷ trước đó');
  if (order.status !== 'pending') {
    throw ApiError.badRequest('Đơn hàng đã được xác nhận hoặc đang giao nên không thể tự huỷ. Vui lòng liên hệ cửa hàng để được hỗ trợ.');
  }
  if (order.paymentStatus === 'paid') {
    throw ApiError.badRequest('Đơn hàng đã thanh toán trực tuyến. Vui lòng liên hệ cửa hàng để được huỷ và hoàn tiền.');
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    // Chỉ huỷ nếu đơn VẪN còn pending (tránh trùng với lúc admin vừa xác nhận)
    const res = await tx.order.updateMany({
      where: { id: orderId, status: 'pending', paymentStatus: { not: 'paid' } },
      data: { status: 'cancelled' },
    });
    if (res.count === 0) throw ApiError.badRequest('Đơn hàng vừa được cập nhật, vui lòng tải lại trang');

    await restockOrderItems(tx, order.items);
    await releaseOrderVouchers(tx, order);
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: 'cancelled',
        note: reason?.trim() || 'Khách hàng huỷ đơn',
        changedBy: 'customer',
        changedAt: new Date(),
      },
    });
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  });

  return toClientOrder(cancelled);
};

/** Lấy trạng thái nhiều đơn guest trong một request; mỗi đơn phải có capability token riêng. */
export const getGuestOrdersByTokens = async (
  credentials: { orderId: string; guestAccessToken: string }[],
) => {
  const safeCredentials = credentials
    .filter((item) => typeof item.orderId === 'string' && typeof item.guestAccessToken === 'string')
    .slice(0, 20);
  if (safeCredentials.length === 0) return [];

  const orders = await prisma.order.findMany({
    where: { id: { in: safeCredentials.map((item) => item.orderId) }, userId: null },
    include: { items: true },
  });
  const credentialsById = new Map(safeCredentials.map((item) => [item.orderId, item.guestAccessToken]));
  return orders
    .filter((order) => matchesGuestToken(credentialsById.get(order.id) || '', order.guestAccessToken))
    .map((order) => toClientOrder(order));
};

/**
 * Khách vãng lai có thể tự huỷ đơn pending bằng capability token ngẫu nhiên được cấp lúc đặt hàng.
 * Không nhận orderCode/email/phone làm bằng chứng sở hữu để tránh đoán đơn hàng.
 */
export const cancelGuestOrder = async (orderId: string, guestAccessToken: string, reason?: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng');
  if (order.userId) throw ApiError.forbidden('Đơn hàng này thuộc tài khoản thành viên');

  if (!matchesGuestToken(guestAccessToken, order.guestAccessToken)) {
    throw ApiError.forbidden('Mã xác thực đơn hàng không hợp lệ');
  }
  if (order.status === 'cancelled') throw ApiError.badRequest('Đơn hàng này đã được huỷ trước đó');
  if (order.status !== 'pending') throw ApiError.badRequest('Đơn hàng đã được xác nhận hoặc đang giao nên không thể tự huỷ');
  if (order.paymentStatus === 'paid') throw ApiError.badRequest('Đơn hàng đã thanh toán. Vui lòng liên hệ cửa hàng để được hỗ trợ hoàn tiền');

  const cancelled = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, userId: null, status: 'pending', paymentStatus: 'unpaid', guestAccessToken: order.guestAccessToken },
      data: { status: 'cancelled' },
    });
    if (result.count === 0) throw ApiError.badRequest('Đơn hàng vừa được cập nhật, vui lòng tải lại trang');
    await restockOrderItems(tx, order.items);
    await releaseOrderVouchers(tx, order);
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: 'cancelled',
        note: reason?.trim() || 'Khách vãng lai huỷ đơn',
        changedBy: 'guest',
        changedAt: new Date(),
      },
    });
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  });

  return toClientOrder(cancelled);
};

/**
 * Tự giải phóng hàng/voucher cho đơn online chưa thanh toán bị bỏ dở.
 * MoMo/VNPay hết hạn sau 2 giờ; chuyển khoản ngân hàng sau 24 giờ; COD không tự hết hạn.
 * updateMany có điều kiện status/paymentStatus trong transaction nên không đụng đơn vừa thanh toán.
 */
export const expireStaleUnpaidOrders = async (now = new Date()): Promise<number> => {
  const momoVnpayCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const bankTransferCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleOrders = await prisma.order.findMany({
    where: {
      status: 'pending',
      paymentStatus: 'unpaid',
      OR: [
        { paymentMethod: { in: ['momo', 'vnpay'] }, createdAt: { lt: momoVnpayCutoff } },
        { paymentMethod: 'bank_transfer', createdAt: { lt: bankTransferCutoff } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { items: true },
  });

  let expiredCount = 0;
  for (const order of staleOrders) {
    const expired = await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: order.id, status: 'pending', paymentStatus: 'unpaid' },
        data: { status: 'cancelled' },
      });
      if (result.count === 0) return false;

      await restockOrderItems(tx, order.items);
      await releaseOrderVouchers(tx, order);
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'cancelled',
          note: 'Đơn tự động huỷ do quá thời hạn thanh toán chưa hoàn tất',
          changedBy: 'system',
          changedAt: now,
        },
      });
      return true;
    });
    if (expired) expiredCount += 1;
  }
  return expiredCount;
};

