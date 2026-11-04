import { prisma } from '../config/db';

type AdminNotification = {
  id: string;
  text: string;
  time: string;
  read: boolean;
  link: string;
};

function formatRelativeTime(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

type TimedNotification = AdminNotification & { at: Date };

/**
 * Thông báo cho chuông admin: đơn hàng cần xử lý, đánh giá chờ duyệt, liên hệ chưa đọc,
 * sản phẩm sắp hết hàng, khách mới đăng ký. Mỗi loại lấy tối đa vài mục để loại này không
 * "đè" mất loại kia; sau đó gộp lại và sắp xếp mới nhất lên đầu.
 * Mục tự biến mất khi admin xử lý xong (duyệt đánh giá, đánh dấu đã đọc liên hệ, xác nhận đơn...).
 */
export const getAdminNotifications = async () => {
  const [orders, pendingReviews, unreadContacts, lowStockProducts, newUsers] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ['pending', 'confirmed'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.review.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        product: { select: { name: true } },
        user: { select: { fullName: true } },
      },
    }),
    prisma.contact.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: 5 } },
      orderBy: { stock: 'asc' },
      take: 3,
    }),
    prisma.user.findMany({
      where: { role: 'customer' },
      orderBy: { createdAt: 'desc' },
      take: 2,
    }),
  ]);

  const notifications: TimedNotification[] = [];

  orders.forEach((order) => {
    notifications.push({
      id: `order-${order.id}`,
      text: `Đơn hàng mới ${order.orderCode} cần xử lý`,
      time: formatRelativeTime(order.createdAt),
      at: order.createdAt,
      read: false,
      link: `/admin/orders?search=${encodeURIComponent(order.orderCode)}&order=${encodeURIComponent(order.id)}`,
    });
  });

  pendingReviews.forEach((review) => {
    notifications.push({
      id: `review-${review.id}`,
      text: `${review.user?.fullName ?? 'Khách hàng'} đánh giá ${review.rating}★ "${review.product?.name ?? 'sản phẩm'}" — chờ duyệt`,
      time: formatRelativeTime(review.createdAt),
      at: review.createdAt,
      read: false,
      link: '/admin/reviews',
    });
  });

  unreadContacts.forEach((contact) => {
    notifications.push({
      id: `contact-${contact.id}`,
      text: `Liên hệ mới từ ${contact.fullName}`,
      time: formatRelativeTime(contact.createdAt),
      at: contact.createdAt,
      read: false,
      link: '/admin/contacts',
    });
  });

  lowStockProducts.forEach((product) => {
    const at = product.updatedAt || product.createdAt;
    notifications.push({
      id: `stock-${product.id}`,
      text: `Sản phẩm "${product.name}" sắp hết hàng (còn ${product.stock})`,
      time: formatRelativeTime(at),
      at,
      read: false,
      link: `/admin/products?search=${encodeURIComponent(product.name)}`,
    });
  });

  newUsers.forEach((user) => {
    notifications.push({
      id: `user-${user.id}`,
      text: `Khách hàng ${user.fullName} vừa đăng ký tài khoản`,
      time: formatRelativeTime(user.createdAt),
      at: user.createdAt,
      read: true,
      link: `/admin/users?search=${encodeURIComponent(user.fullName)}`,
    });
  });

  return notifications
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 15)
    .map(({ at: _at, ...rest }) => rest);
};
