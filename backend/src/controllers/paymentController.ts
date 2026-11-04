import crypto from 'crypto';
import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { env } from '../config/env';
import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import {
  createMoMoUrl,
  createVNPayUrl,
  verifyMoMoIPN,
  verifyVNPayReturn,
} from '../services/paymentService';

const SITE_URL = env.clientUrl;

const constantTimeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
};

const markOrderPaid = async (orderCode: string, amount: number, expectedMethod: 'momo' | 'vnpay' | 'bank_transfer'): Promise<boolean> => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderCode } });
    if (!order || order.paymentMethod !== expectedMethod || !Number.isFinite(amount) || order.finalAmount !== amount || order.status === 'cancelled') return false;
    if (order.paymentStatus === 'paid') return true;

    const result = await tx.order.updateMany({
      where: {
        orderCode,
        paymentMethod: expectedMethod,
        finalAmount: amount,
        paymentStatus: 'unpaid',
        status: { not: 'cancelled' },
      },
      data: {
        paymentStatus: 'paid',
        ...(order.status === 'pending' ? { status: 'confirmed' } : {}),
      },
    });
    if (result.count !== 1) {
      const refreshed = await tx.order.findUnique({ where: { orderCode } });
      return Boolean(refreshed && refreshed.paymentMethod === expectedMethod && refreshed.paymentStatus === 'paid' && refreshed.finalAmount === amount);
    }
    if (order.status === 'pending') {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'confirmed',
          note: expectedMethod === 'bank_transfer'
            ? 'Đã nhận chuyển khoản (giả lập ngân hàng)'
            : 'Thanh toán trực tuyến đã được cổng thanh toán xác thực',
          changedBy: 'payment_gateway',
        },
      });
    }
    return true;
  });
};

// ─── Tạo URL thanh toán ────────────────────────────────────
export const createPaymentUrl = catchAsync(async (req, res) => {
  const { orderId, method, guestAccessToken } = req.body as {
    orderId?: string;
    method?: string;
    guestAccessToken?: string;
  };
  if (!orderId || !method) throw ApiError.badRequest('Thiếu orderId hoặc method');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng');
  if (order.paymentStatus === 'paid') throw ApiError.badRequest('Đơn hàng đã được thanh toán');
  if (order.status === 'cancelled' || order.status === 'completed') {
    throw ApiError.badRequest('Đơn hàng không còn đủ điều kiện thanh toán');
  }
  if (order.paymentMethod !== method) throw ApiError.badRequest('Phương thức thanh toán không khớp với đơn hàng');

  if (order.userId) {
    if (req.user?.id !== order.userId && req.user?.role !== 'admin') {
      throw ApiError.forbidden('Bạn không có quyền thanh toán đơn hàng này');
    }
  } else if (req.user?.role !== 'admin' && (!guestAccessToken || !order.guestAccessToken || !constantTimeEqual(guestAccessToken, order.guestAccessToken))) {
    throw ApiError.forbidden('Thiếu mã xác thực đơn hàng khách');
  }

  // Chế độ demo: trả về trang cổng thanh toán GIẢ LẬP của chính website (không gọi VNPay/MoMo thật)
  if (env.payment.mode === 'mock') {
    if (method !== 'vnpay' && method !== 'momo' && method !== 'bank_transfer') {
      throw ApiError.badRequest('Phương thức thanh toán không hỗ trợ');
    }
    // Chuyển khoản ngân hàng dùng trang mô phỏng ứng dụng ngân hàng: /payment/mock/bank
    const pageSegment = method === 'bank_transfer' ? 'bank' : method;
    const tokenPart = !order.userId && order.guestAccessToken
      ? `&guestAccessToken=${encodeURIComponent(order.guestAccessToken)}`
      : '';
    res.json({ paymentUrl: `${SITE_URL}/payment/mock/${pageSegment}?order=${encodeURIComponent(order.orderCode)}${tokenPart}`, mock: true });
    return;
  }

  // Chế độ live: chuyển khoản ngân hàng không đi qua cổng thanh toán (admin tự đối soát tiền về)
  if (method === 'bank_transfer') throw ApiError.badRequest('Chuyển khoản ngân hàng không dùng cổng thanh toán trực tuyến');

  const ipAddr = req.ip || req.socket.remoteAddress || '127.0.0.1';

  let paymentUrl: string | undefined;
  if (method === 'vnpay') {
    paymentUrl = createVNPayUrl({
      orderCode: order.orderCode,
      amount: order.finalAmount,
      orderInfo: `Thanh toan don hang ${order.orderCode}`,
      ipAddr,
    });
  } else if (method === 'momo') {
    paymentUrl = await createMoMoUrl({
      orderCode: order.orderCode,
      amount: order.finalAmount,
      orderInfo: `Thanh toan don hang ${order.orderCode}`,
    });
  } else {
    throw ApiError.badRequest('Phương thức thanh toán không hỗ trợ');
  }

  if (!paymentUrl) throw ApiError.internal('Cổng thanh toán không trả về đường dẫn hợp lệ');
  res.json({ paymentUrl });
});

// VNPay's browser Return URL is for displaying the result only. The authoritative
// order update is handled by the server-to-server IPN endpoint below.
export const vnpayReturn = async (req: Request, res: Response) => {
  const result = verifyVNPayReturn(req.query);
  if (!result.valid) return res.redirect(`${SITE_URL}/payment/result?status=error&msg=invalid_signature`);
  const status = result.success ? 'success' : 'failed';
  return res.redirect(`${SITE_URL}/payment/result?status=${status}&order=${encodeURIComponent(result.orderCode)}`);
};

// Configure this endpoint as the VNPay IPN URL in the merchant portal.
export const vnpayIPN = async (req: Request, res: Response) => {
  const result = verifyVNPayReturn(req.query);
  if (!result.valid) return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });

  try {
    const order = await prisma.order.findUnique({ where: { orderCode: result.orderCode } });
    if (!order) return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    if (order.finalAmount !== result.amount) return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    if (order.paymentStatus === 'paid') return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });

    // Failed transactions are acknowledged but never change the payment state.
    if (!result.success) return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
    const paid = await markOrderPaid(result.orderCode, result.amount, 'vnpay');
    return res.status(200).json(paid
      ? { RspCode: '00', Message: 'Confirm success' }
      : { RspCode: '99', Message: 'Could not update order' });
  } catch {
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

// MoMo IPN: only a signed callback for the exact order amount can mark an order paid.
export const momoIPN = async (req: Request, res: Response) => {
  const result = verifyMoMoIPN(req.body as Record<string, unknown>);
  if (!result.valid) return res.status(400).json({ resultCode: 1, message: 'Invalid signature' });

  try {
    if (result.success) {
      const paid = await markOrderPaid(result.orderCode, result.amount, 'momo');
      if (!paid) return res.status(400).json({ resultCode: 1, message: 'Order or amount mismatch' });
    }
    return res.json({ resultCode: 0, message: 'Success' });
  } catch {
    return res.status(500).json({ resultCode: 1, message: 'Server error' });
  }
};

// Browser return is also signature-checked; IPN and return are both idempotent.
export const momoReturn = catchAsync(async (req, res) => {
  const result = verifyMoMoIPN(req.query as Record<string, unknown>);
  if (!result.valid) return res.redirect(`${SITE_URL}/payment/result?status=error&msg=invalid_signature`);

  const orderCode = result.orderCode;
  if (!result.success) {
    return res.redirect(`${SITE_URL}/payment/result?status=failed&order=${encodeURIComponent(orderCode)}`);
  }
  const paid = await markOrderPaid(orderCode, result.amount, 'momo');
  return res.redirect(`${SITE_URL}/payment/result?status=${paid ? 'success' : 'error'}&order=${encodeURIComponent(orderCode)}`);
});

// The result page never trusts a query-string status. It loads the real order status.
export const getPaymentStatus = catchAsync(async (req, res) => {
  const { orderCode } = req.params;
  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng');

  if (order.userId) {
    if (req.user?.id !== order.userId && req.user?.role !== 'admin') {
      throw ApiError.forbidden('Bạn không có quyền xem trạng thái đơn hàng này');
    }
  } else {
    const token = typeof req.query.guestAccessToken === 'string' ? req.query.guestAccessToken : '';
    if (!token || !order.guestAccessToken || !constantTimeEqual(token, order.guestAccessToken)) {
      throw ApiError.forbidden('Mã xác thực đơn hàng không hợp lệ');
    }
  }

  res.json({
    orderCode: order.orderCode,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    finalAmount: order.finalAmount,
  });
});

// ─── Cổng thanh toán GIẢ LẬP (chỉ bật khi PAYMENT_MODE=mock) ──────────────
// Trang /payment/mock/:method của frontend gọi endpoint này khi khách bấm "thanh toán thành công / thất bại".
// Ở chế độ live endpoint này không tồn tại (404) nên không thể dùng để tự đánh dấu "đã thanh toán".
export const mockConfirmPayment = catchAsync(async (req, res) => {
  if (env.payment.mode !== 'mock') throw ApiError.notFound('Không tìm thấy');

  const { orderCode, outcome, guestAccessToken } = req.body as {
    orderCode?: string;
    outcome?: string;
    guestAccessToken?: string;
  };
  if (!orderCode || (outcome !== 'success' && outcome !== 'failed')) {
    throw ApiError.badRequest('Thiếu mã đơn hàng hoặc kết quả thanh toán');
  }

  const order = await prisma.order.findUnique({ where: { orderCode } });
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng');
  if (order.paymentMethod !== 'momo' && order.paymentMethod !== 'vnpay' && order.paymentMethod !== 'bank_transfer') {
    throw ApiError.badRequest('Đơn hàng này không thanh toán trực tuyến');
  }
  if (order.userId) {
    if (req.user?.id !== order.userId && req.user?.role !== 'admin') {
      throw ApiError.forbidden('Bạn không có quyền thanh toán đơn hàng này');
    }
  } else if (req.user?.role !== 'admin' && (!guestAccessToken || !order.guestAccessToken || !constantTimeEqual(guestAccessToken, order.guestAccessToken))) {
    throw ApiError.forbidden('Thiếu mã xác thực đơn hàng khách');
  }
  if (order.status === 'cancelled') throw ApiError.badRequest('Đơn hàng đã bị huỷ, không thể thanh toán');

  if (outcome === 'failed') {
    res.json({ status: 'failed', orderCode });
    return;
  }

  const paid = await markOrderPaid(orderCode, order.finalAmount, order.paymentMethod as 'momo' | 'vnpay' | 'bank_transfer');
  res.json({ status: paid ? 'success' : 'error', orderCode });
});
