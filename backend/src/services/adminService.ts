import crypto from 'crypto';
import type { Prisma, Product, Post } from '@prisma/client';
import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';
import { toClientOrder } from '../helpers/orderMapper';
import { restockOrderItems } from './orderService';
import { releaseOrderVouchers } from './voucherService';
import { normalizeVN } from './productService';
import { SAMPLE_POSTS } from '../data/samplePosts';

type AdminProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: { select: { name: true } } }
}>;

type ProductListQuery = {
  category?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
};

type OrderListQuery = {
  status?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
};

type UserListQuery = {
  role?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
};

type ShippingInfoInput = {
  provider?: string;
  trackingCode?: string;
  pickupLocation?: string;
};

type UpdateOrderStatusInput = {
  status?: string;
  paymentStatus?: string;
  shippingInfo?: ShippingInfoInput;
  changedBy?: string;
  note?: string;
};

type ShippingWebhookInput = {
  webhookToken: string;
  trackingStatus: string;
  statusLabel?: string;
  location?: string;
  note?: string;
};

// parseInt của JS bản chất là parseInt(String(value)) — dùng String() để giữ nguyên behavior
// khi page/limit đến từ query string (string) hoặc giá trị mặc định (number).
const toInt = (value: number | string): number => parseInt(String(value));

// ─── PRODUCT ──────────────────────────────────────────────
/** Danh mục được chọn + toàn bộ danh mục con (chọn "Máy tính & PC" thì thấy cả sản phẩm ở danh mục con). */
const collectCategoryIds = async (rootId: string): Promise<string[]> => {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    const list = childrenOf.get(c.parentId) ?? [];
    list.push(c.id);
    childrenOf.set(c.parentId, list);
  }
  const seen = new Set<string>([rootId]); // Set chặn vòng lặp nếu dữ liệu cha-con bị tham chiếu vòng
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const childId of childrenOf.get(current) ?? []) {
      if (!seen.has(childId)) { seen.add(childId); queue.push(childId); }
    }
  }
  return [...seen];
};

export const getAllProducts = async ({ category, search, page = 1, limit = 20 }: ProductListQuery) => {
  const p = Math.max(1, toInt(page) || 1);
  const l = Math.min(200, toInt(limit) || 20);
  const skip = (p - 1) * l;

  const where: Prisma.ProductWhereInput = {};
  if (category && category !== 'all') where.categoryId = { in: await collectCategoryIds(category) };

  // Tìm kiếm không phân biệt dấu / hoa-thường, khớp theo tên + hãng + SKU + tag.
  // Prisma `contains` không bỏ dấu được nên lọc bằng normalizeVN ở tầng service
  // (cửa hàng chỉ có vài trăm sản phẩm nên chi phí không đáng kể).
  const tokens = normalizeVN(search ?? '').split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    const candidates = await prisma.product.findMany({
      where,
      select: { id: true, name: true, brand: true, sku: true, tags: true, createdAt: true },
    });
    const matchedIds = candidates
      .filter((c) => {
        const haystack = normalizeVN([c.name, c.brand ?? '', c.sku ?? '', ...c.tags].join(' '));
        const words = haystack.split(' ');
        // Từ ngắn (<3 ký tự) chỉ khớp đầu từ để "pc" không dính "IPC", "in" không dính "tinh";
        // từ dài hơn khớp ở bất kỳ đâu để tìm được mảnh mã SKU như "3520".
        return tokens.every((token) => (token.length >= 3 ? haystack.includes(token) : words.some((w) => w.startsWith(token))));
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => c.id);

    const pageIds = matchedIds.slice(skip, skip + l);
    const rows = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      include: { category: { select: { name: true } } },
    });
    const order = new Map(pageIds.map((id, index) => [id, index]));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return {
      products: rows.map((row: AdminProductWithCategory) => ({ ...row, _id: row.id })),
      total: matchedIds.length,
      totalPages: Math.ceil(matchedIds.length / l),
      currentPage: p,
    };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: l,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p: AdminProductWithCategory) => ({ ...p, _id: p.id })),
    total,
    totalPages: Math.ceil(total / l),
    currentPage: p
  };
};

type AdminCreateProductInput = Omit<Prisma.ProductUncheckedCreateInput, 'slug'> & { slug?: string };

const toProductSlug = (value: string): string =>
  normalizeVN(value).replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'san-pham';

const buildUniqueProductSlug = async (value: string): Promise<string> => {
  const base = toProductSlug(value);
  let candidate = base;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
};

export const createProduct = async (data: AdminCreateProductInput) => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) throw ApiError.badRequest('Tên sản phẩm là bắt buộc');
  if (!data.categoryId) throw ApiError.badRequest('Vui lòng chọn danh mục sản phẩm');
  if (!Number.isFinite(Number(data.price)) || Number(data.price) < 0) {
    throw ApiError.badRequest('Giá sản phẩm không hợp lệ');
  }
  if (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0) {
    throw ApiError.badRequest('Số lượng tồn kho không hợp lệ');
  }

  const requestedSlug = typeof data.slug === 'string' && data.slug.trim() ? data.slug : name;
  const slug = await buildUniqueProductSlug(requestedSlug);
  const createData: Prisma.ProductUncheckedCreateInput = { ...data, name, slug };

  try {
    const product = await prisma.product.create({
      data: createData,
      include: { category: { select: { name: true } } },
    });
    return { ...product, _id: product.id };
  } catch (error) {
    // Bao gồm trường hợp SKU bị trùng hoặc có request đồng thời tạo cùng slug.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw ApiError.badRequest('SKU hoặc đường dẫn sản phẩm đã tồn tại');
    }
    throw error;
  }
};

export const updateProduct = async (id: string, data: Prisma.ProductUncheckedUpdateInput) => {
  try {
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    return { ...product, _id: product.id };
  } catch {
    throw ApiError.notFound('Không tìm thấy sản phẩm');
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Đã ẩn sản phẩm (soft delete)', product: { ...product, _id: product.id } };
  } catch {
    throw ApiError.notFound('Không tìm thấy sản phẩm');
  }
};

// ─── CATEGORY ─────────────────────────────────────────────
export const getAllCategories = async () => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return categories.map((category) => ({ ...category, _id: category.id }));
};

export const createCategory = async (data: Prisma.CategoryUncheckedCreateInput) => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
  if (!name || !slug) throw ApiError.badRequest('Tên và đường dẫn danh mục là bắt buộc');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw ApiError.badRequest('Đường dẫn chỉ được chứa chữ thường không dấu, số và dấu gạch ngang');
  }
  const duplicate = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (duplicate) throw ApiError.badRequest('Đường dẫn danh mục đã tồn tại');
  const cat = await prisma.category.create({
    data: { ...data, name, slug, description: typeof data.description === 'string' ? data.description.trim() : data.description },
  });
  return { ...cat, _id: cat.id };
};

export const updateCategory = async (id: string, data: Prisma.CategoryUncheckedUpdateInput) => {
  const updateData = { ...data };
  if (typeof updateData.name === 'string') {
    const name = updateData.name.trim();
    if (!name) throw ApiError.badRequest('Tên danh mục không được để trống');
    updateData.name = name;
  }
  if (typeof updateData.slug === 'string') {
    const slug = updateData.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw ApiError.badRequest('Đường dẫn chỉ được chứa chữ thường không dấu, số và dấu gạch ngang');
    }
    updateData.slug = slug;
    const duplicate = await prisma.category.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
    if (duplicate) throw ApiError.badRequest('Đường dẫn danh mục đã tồn tại');
  }
  try {
    const cat = await prisma.category.update({ where: { id }, data: updateData });
    return { ...cat, _id: cat.id };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.notFound('Không tìm thấy danh mục');
  }
};

export const deleteCategory = async (id: string) => {
  // ✅ FIX: Soft delete thay vì hard delete để không phá product liên quan
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) throw ApiError.notFound('Không tìm thấy danh mục');

  const updatedCat = await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
  return { message: 'Đã ẩn danh mục (soft delete)', category: { ...updatedCat, _id: updatedCat.id } };
};

// ─── ORDER ────────────────────────────────────────────────
// Nhãn tiếng Việt cho đơn vị vận chuyển
const PROVIDER_LABELS: Record<string, string> = {
  ghn: 'Giao Hàng Nhanh (GHN)',
  ghtk: 'Giao Hàng Tiết Kiệm (GHTK)',
  viettelpost: 'Viettel Post',
  manual: 'Tự giao / Khác',
};

export const getAllOrders = async ({ status, search, page = 1, limit = 20 }: OrderListQuery) => {
  const currentPage = Math.max(1, toInt(page) || 1);
  const pageSize = Math.min(100, Math.max(1, toInt(limit) || 20));
  const term = search?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(term ? {
      OR: [
        { orderCode: { contains: term, mode: 'insensitive' } },
        { customerFullName: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term } },
        { customerEmail: { contains: term, mode: 'insensitive' } },
        { id: term },
      ],
    } : {}),
  };
  const skip = (currentPage - 1) * pageSize;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { user: { select: { fullName: true, email: true } }, items: true },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map(o => ({
      ...toClientOrder(o),
      // userId giữ dạng object như cũ; thêm userInfo + customerType để admin biết khách đã đăng ký hay vãng lai
      userId: o.user ? { _id: o.userId, fullName: o.user.fullName, email: o.user.email } : null,
      userInfo: o.user ? { fullName: o.user.fullName, email: o.user.email } : null,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    currentPage,
  };
};

export const updateOrderStatus = async (
  id: string,
  { status, paymentStatus, shippingInfo: si, changedBy = 'admin', note = '' }: UpdateOrderStatusInput
) => {
  const allowed = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];
  if (status && !allowed.includes(status)) throw ApiError.badRequest('Trạng thái không hợp lệ');
  if (paymentStatus && !['unpaid', 'paid', 'refunded'].includes(paymentStatus)) {
    throw ApiError.badRequest('Trạng thái thanh toán không hợp lệ');
  }

  const order = await prisma.order.findUnique({ where: { id }, include: { trackingHistory: true, statusHistory: true, items: true } });
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng');

  const transitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipping', 'cancelled'],
    shipping: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };
  if (status && !transitions[order.status].includes(status)) {
    throw ApiError.badRequest(`Không thể chuyển từ "${order.status}" sang "${status}"`);
  }
  if (status === 'cancelled' && (order.paymentStatus === 'paid' || paymentStatus === 'paid')) {
    throw ApiError.badRequest('Đơn đã thanh toán. Cần hoàn tiền qua cổng thanh toán trước khi huỷ đơn.');
  }

  const scalarData: Prisma.OrderUncheckedUpdateManyInput = {};
  const trackingCreates: Prisma.ShippingTrackingHistoryUncheckedCreateWithoutOrderInput[] = [];

  if (status === 'shipping') {
    if (!si?.provider) throw ApiError.badRequest('Vui lòng chọn đơn vị vận chuyển');
    const provider = si.provider;
    scalarData.shippingProvider = provider;
    scalarData.shippingProviderLabel = PROVIDER_LABELS[provider] || provider;
    scalarData.shippingTrackingCode = si.trackingCode || '';
    scalarData.shippingWebhookToken = crypto.randomBytes(20).toString('hex');
    scalarData.shippingDeliveredAt = null;
    scalarData.shippingFailedAt = null;
    trackingCreates.push({
      status: 'picked_up',
      statusLabel: 'Đã lấy hàng',
      location: si.pickupLocation || '',
      note: note || 'Đã bàn giao cho đơn vị vận chuyển',
      recordedAt: new Date(),
      source: 'admin',
    });
  }

  if (status === 'completed' && order.shippingProvider) {
    scalarData.shippingDeliveredAt = new Date();
    trackingCreates.push({
      status: 'delivered',
      statusLabel: 'Đã giao thành công',
      note: note || 'Xác nhận thủ công bởi admin',
      recordedAt: new Date(),
      source: 'admin',
    });
  }
  if (paymentStatus) scalarData.paymentStatus = paymentStatus;

  const updatedOrder = await prisma.$transaction(async (tx) => {
    if (status) scalarData.status = status;

    if (status || paymentStatus) {
      const changed = await tx.order.updateMany({
        where: {
          id,
          // Compare both states even when only one is being edited. A concurrent
          // cancel/payment callback must not be overwritten by an admin update.
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        data: scalarData,
      });
      if (changed.count !== 1) {
        throw ApiError.badRequest('Đơn hàng vừa được cập nhật bởi thao tác khác. Vui lòng tải lại trang.');
      }
    }

    if (status === 'cancelled') {
      await restockOrderItems(tx, order.items);
      await releaseOrderVouchers(tx, order);
    }

    if (status) {
      await tx.orderStatusHistory.create({
        data: { orderId: id, status, note, changedBy, changedAt: new Date() },
      });
    }
    if (trackingCreates.length > 0) {
      await tx.shippingTrackingHistory.createMany({
        data: trackingCreates.map((item) => ({ ...item, orderId: id })),
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id },
      include: {
        trackingHistory: true,
        statusHistory: true,
        items: true,
        user: { select: { fullName: true, email: true } },
      },
    });
  });

  return {
    ...toClientOrder(updatedOrder),
    userInfo: updatedOrder.user ? { fullName: updatedOrder.user.fullName, email: updatedOrder.user.email } : null,
    shippingInfo: updatedOrder.shippingProvider ? {
      provider: updatedOrder.shippingProvider,
      providerLabel: updatedOrder.shippingProviderLabel,
      trackingCode: updatedOrder.shippingTrackingCode,
      webhookToken: updatedOrder.shippingWebhookToken,
      trackingHistory: updatedOrder.trackingHistory,
      deliveredAt: updatedOrder.shippingDeliveredAt,
      failedAt: updatedOrder.shippingFailedAt,
    } : null,
  };
};

export const handleShippingWebhook = async ({ webhookToken, trackingStatus, statusLabel, location, note }: ShippingWebhookInput) => {
  if (typeof webhookToken !== 'string' || !/^[a-f0-9]{40}$/i.test(webhookToken)) {
    throw ApiError.unauthorized('Thông tin xác thực webhook không hợp lệ');
  }
  const allowedStatuses = new Set(['picked_up', 'in_transit', 'delivered', 'failed']);
  if (typeof trackingStatus !== 'string' || !allowedStatuses.has(trackingStatus)) {
    throw ApiError.badRequest('Trạng thái vận chuyển không hợp lệ');
  }
  const safeStatusLabel = typeof statusLabel === 'string' ? statusLabel.trim().slice(0, 120) : '';
  const safeLocation = typeof location === 'string' ? location.trim().slice(0, 160) : '';
  const safeNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';

  const order = await prisma.order.findFirst({ where: { shippingWebhookToken: webhookToken }, select: { id: true, orderCode: true, status: true, shippingProviderLabel: true } });
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng đang vận chuyển phù hợp');
  if (order.status !== 'shipping') {
    if (order.status === 'completed' && trackingStatus === 'delivered') return { success: true, duplicate: true, orderCode: order.orderCode, newStatus: 'completed' };
    return { ignored: true, reason: 'order_not_in_shipping_status' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: 'shipping', shippingWebhookToken: webhookToken },
      data: trackingStatus === 'delivered'
        ? { status: 'completed', shippingDeliveredAt: new Date() }
        : trackingStatus === 'failed'
          ? { shippingFailedAt: new Date() }
          : {},
    });
    if (changed.count !== 1) return false;

    await tx.shippingTrackingHistory.create({
      data: {
        orderId: order.id,
        status: trackingStatus,
        statusLabel: safeStatusLabel || trackingStatus,
        location: safeLocation,
        note: safeNote,
        recordedAt: new Date(),
        source: 'webhook',
      },
    });

    if (trackingStatus === 'delivered') {
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'completed', note: `Đơn hàng được xác nhận đã giao bởi ${order.shippingProviderLabel || 'đơn vị vận chuyển'}`, changedBy: 'webhook' },
      });
    } else if (trackingStatus === 'failed') {
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'shipping', note: `Giao hàng không thành công: ${safeNote || 'Không có ghi chú'}`, changedBy: 'webhook' },
      });
    }
    return true;
  });

  if (!updated) return { ignored: true, reason: 'order_already_updated' };
  return { success: true, orderCode: order.orderCode, newStatus: trackingStatus === 'delivered' ? 'completed' : 'shipping' };
};

// ─── BANNER ───────────────────────────────────────────────
export const createBanner = async (data: Prisma.BannerUncheckedCreateInput) => {
  const banner = await prisma.banner.create({ data });
  return { ...banner, _id: banner.id };
};

export const updateBanner = async (id: string, data: Prisma.BannerUncheckedUpdateInput) => {
  try {
    const banner = await prisma.banner.update({ where: { id }, data });
    return { ...banner, _id: banner.id };
  } catch {
    throw ApiError.notFound('Không tìm thấy banner');
  }
};

export const deleteBanner = async (id: string) => {
  try {
    await prisma.banner.delete({ where: { id } });
    return { message: 'Đã xóa banner' };
  } catch {
    throw ApiError.notFound('Không tìm thấy banner');
  }
};

// ─── POST ─────────────────────────────────────────────────
/**
 * Xoá VĨNH VIỄN tài khoản khách hàng.
 *  - Không xoá admin, không tự xoá chính mình.
 *  - Chặn nếu khách còn đơn đang xử lý (chờ xác nhận / đang giao...) — khi đó nên khoá tài khoản.
 *  - Giỏ hàng, yêu thích, đánh giá, địa chỉ bị xoá theo (cascade). Đơn hàng cũ được GIỮ LẠI để đối soát
 *    (chỉ bị gỡ liên kết với tài khoản, vẫn còn tên/SĐT/địa chỉ người nhận).
 */
export const deleteUser = async (id: string, actorId?: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('Không tìm thấy user');
  if (user.role === 'admin') throw ApiError.badRequest('Không thể xoá tài khoản quản trị viên');
  if (actorId && actorId === user.id) throw ApiError.badRequest('Bạn không thể tự xoá tài khoản của mình');

  const openOrders = await prisma.order.count({
    where: { userId: id, status: { notIn: ['completed', 'cancelled'] } },
  });
  if (openOrders > 0) {
    throw ApiError.badRequest(`Tài khoản còn ${openOrders} đơn hàng chưa hoàn tất. Hãy xử lý đơn trước hoặc chọn "Khoá tài khoản".`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { userId: id }, data: { userId: null } });
    await tx.user.delete({ where: { id } });
  });
  return { message: 'Đã xoá tài khoản người dùng' };
};

/** Nhập các tin mẫu (bỏ qua bài đã có cùng tiêu đề) — dùng khi trang tin tức đang trống. */
export const seedSamplePosts = async () => {
  let created = 0;
  for (const sample of SAMPLE_POSTS) {
    const existed = await prisma.post.findFirst({ where: { title: sample.title }, select: { id: true } });
    if (existed) continue;
    const slug = await buildUniquePostSlug(sample.title);
    await prisma.post.create({
      data: {
        title: sample.title,
        slug,
        content: sample.content,
        thumbnail: sample.thumbnail,
        isActive: true,
        createdAt: new Date(sample.date),
      },
    });
    created += 1;
  }
  return { created, total: SAMPLE_POSTS.length };
};

/** Tạo slug không dấu từ tiêu đề, tự thêm hậu tố nếu bị trùng. */
const buildUniquePostSlug = async (title: string): Promise<string> => {
  const base = normalizeVN(title).replace(/\s+/g, '-').slice(0, 80) || 'bai-viet';
  let slug = base;
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${base}-${Date.now().toString(36)}`;
  }
  return slug;
};

/** Admin xem TẤT CẢ bài (kể cả bản nháp) — khác `/api/posts` công khai chỉ trả bài đang đăng. */
export const getAllPosts = async () => {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
  return posts.map((p: Post) => ({ ...p, _id: p.id }));
};

export const createPost = async (data: Prisma.PostUncheckedCreateInput) => {
  if (!data.title || !String(data.title).trim()) throw ApiError.badRequest('Vui lòng nhập tiêu đề bài viết');
  const slug = data.slug && String(data.slug).trim() ? String(data.slug).trim() : await buildUniquePostSlug(String(data.title));
  const post = await prisma.post.create({ data: { ...data, slug } });
  return { ...post, _id: post.id };
};

export const updatePost = async (id: string, data: Prisma.PostUncheckedUpdateInput) => {
  try {
    const post = await prisma.post.update({ where: { id }, data });
    return { ...post, _id: post.id };
  } catch {
    throw ApiError.notFound('Không tìm thấy bài viết');
  }
};

export const deletePost = async (id: string) => {
  try {
    await prisma.post.delete({ where: { id } });
    return { message: 'Đã xóa bài viết' };
  } catch {
    throw ApiError.notFound('Không tìm thấy bài viết');
  }
};

// ─── USER MANAGEMENT ──────────────────────────────────────
export const getAllUsers = async ({ page = 1, limit = 20, role, search }: UserListQuery) => {
  const skip = (toInt(page) - 1) * toInt(limit);

  // Lọc theo vai trò + từ khoá ngay ở backend (trước đây lọc ở trình duyệt nên chỉ lọc được trang đang xem)
  const where: Prisma.UserWhereInput = {};
  if (role && role !== 'all') where.role = role;
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, phone: true, role: true, avatar: true, isActive: true, createdAt: true, updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: toInt(limit),
    }),
    prisma.user.count({ where }),
  ]);
  return {
    users: users.map(u => ({ ...u, _id: u.id })),
    total,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page)
  };
};

export const toggleUserStatus = async (id: string, actorId?: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('Không tìm thấy user');
  if (user.role === 'admin') throw ApiError.badRequest('Không thể khoá tài khoản quản trị viên');
  if (actorId && actorId === user.id) throw ApiError.badRequest('Bạn không thể tự khoá tài khoản của mình');
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive, ...(!user.isActive ? {} : { tokenVersion: { increment: 1 }, refreshTokenHash: null }) },
  });
  return {
    message: `Tài khoản đã ${updatedUser.isActive ? 'mở khoá' : 'bị khoá'}`,
    isActive: updatedUser.isActive,
  };
};

// ─── DASHBOARD STATS ──────────────────────────────────────
export const getDashboardStats = async () => {
  const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

  const [totalUsers, totalProducts, totalOrders, revenueResult, recentOrders, topProductsRaw, ordersForChart] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { finalAmount: true },
      where: { status: 'completed' },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { fullName: true, email: true } }, items: true },
    }),
    prisma.product.findMany({
      orderBy: { sold: 'desc' },
      take: 4,
    }),
    prisma.order.findMany({
      where: { status: 'completed', createdAt: { gte: currentYearStart } },
      select: { createdAt: true, finalAmount: true },
    })
  ]);

  const topProducts = topProductsRaw.map((p: Product) => ({
    name: p.name,
    sold: p.sold || 0,
    revenue: (p.sold || 0) * p.price,
    image: p.images && p.images.length > 0 ? p.images[0] : ''
  }));

  const currentYear = new Date().getFullYear().toString();
  const chartData = [
    { month: 'T1', value: 0 }, { month: 'T2', value: 0 }, { month: 'T3', value: 0 },
    { month: 'T4', value: 0 }, { month: 'T5', value: 0 }, { month: 'T6', value: 0 },
    { month: 'T7', value: 0 }, { month: 'T8', value: 0 }, { month: 'T9', value: 0 },
    { month: 'T10', value: 0 }, { month: 'T11', value: 0 }, { month: 'T12', value: 0 },
  ];

  ordersForChart.forEach(order => {
    const month = new Date(order.createdAt).getMonth();
    chartData[month].value += (order.finalAmount / 1000000);
  });

  const chartDataByYear = {
    [currentYear]: chartData
  };

  return {
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue: revenueResult._sum.finalAmount || 0,
    // Cùng shape với trang Đơn hàng (customerInfo, items...) để modal chi tiết ở Tổng quan đủ thông tin.
    recentOrders: recentOrders.map(o => ({
      ...toClientOrder(o),
      userId: o.user ? { _id: o.userId, fullName: o.user.fullName, email: o.user.email } : null
    })),
    topProducts,
    chartDataByYear
  };
};