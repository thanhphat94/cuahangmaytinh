import type { Order } from '@prisma/client';

/**
 * Chuẩn hoá một đơn hàng Prisma (field phẳng `customerFullName`, `customerPhone`...)
 * sang shape mà giao diện đang đọc (`customerInfo`, `_id`) và gắn nhãn loại khách:
 *   - 'member' : đặt khi đã đăng nhập (có userId)
 *   - 'guest'  : khách vãng lai (userId = null)
 */
export const toClientOrder = <T extends Order>(order: T) => ({
  ...order,
  _id: order.id,
  customerInfo: {
    fullName: order.customerFullName,
    phone: order.customerPhone,
    email: order.customerEmail ?? '',
    address: order.customerAddress,
  },
  customerType: (order.userId ? 'member' : 'guest') as 'member' | 'guest',
  // Capability token lets a guest retry/check payment without exposing other guest orders.
  guestAccessToken: order.userId ? undefined : order.guestAccessToken,
});
