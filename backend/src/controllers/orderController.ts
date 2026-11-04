import crypto from 'crypto';
import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import * as orderService from '../services/orderService';

// Shape input lấy trực tiếp từ service (spec §9) — không trùng khai báo type.
type CreateOrderInput = Parameters<typeof orderService.createOrder>[0];

export const createOrder = catchAsync(async (req, res) => {
  const order = await orderService.createOrder(req.body as CreateOrderInput, req.user?.id);
  res.status(201).json(order);
});

export const getMyOrders = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const orders = await orderService.getMyOrders(userId);
  res.json(orders);
});

export const cancelOrder = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const { reason } = (req.body ?? {}) as { reason?: string };
  const order = await orderService.cancelMyOrder(req.params.id, userId, reason);
  res.json(order);
});


export const getGuestOrders = catchAsync(async (req, res) => {
  const body = (req.body ?? {}) as { orders?: unknown };
  if (!Array.isArray(body.orders) || body.orders.length > 20) {
    throw ApiError.badRequest('Danh sách đơn hàng khách không hợp lệ (tối đa 20 đơn)');
  }
  const credentials = body.orders.filter((item): item is { orderId: string; guestAccessToken: string } =>
    Boolean(item) && typeof item === 'object' &&
    typeof (item as { orderId?: unknown }).orderId === 'string' &&
    typeof (item as { guestAccessToken?: unknown }).guestAccessToken === 'string'
  );
  const orders = await orderService.getGuestOrdersByTokens(credentials);
  res.json(orders);
});

export const getOrderById = catchAsync(async (req, res) => {
  const user = req.user;
  const order = await orderService.getOrderById(req.params.id);
  if (!order) throw ApiError.notFound('Không tìm thấy đơn hàng');

  if (order.userId) {
    if (!user) throw ApiError.unauthorized('Vui lòng đăng nhập để xem đơn hàng này');
    if (user.role !== 'admin' && order.userId.toString() !== user.id.toString()) {
      throw ApiError.forbidden('Bạn không có quyền xem đơn hàng này');
    }
  } else if (user?.role !== 'admin') {
    const supplied = req.headers['x-guest-order-token'];
    const guestToken = typeof supplied === 'string' ? supplied : '';
    const expected = order.guestAccessToken || '';
    const a = Buffer.from(guestToken);
    const b = Buffer.from(expected);
    if (!guestToken || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw ApiError.forbidden('Bạn không có mã xác thực của đơn hàng khách');
    }
  }

  res.json(order);
});

export const cancelGuestOrder = catchAsync(async (req, res) => {
  const { reason, guestAccessToken } = (req.body ?? {}) as { reason?: string; guestAccessToken?: string };
  if (!guestAccessToken || typeof guestAccessToken !== 'string') {
    throw ApiError.badRequest('Thiếu mã xác thực đơn hàng khách');
  }
  const order = await orderService.cancelGuestOrder(req.params.id, guestAccessToken, reason);
  res.json(order);
});

