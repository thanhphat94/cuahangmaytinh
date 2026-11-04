import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

export const getWishlist = async (userId: string) => {
  const items = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, price: true,
          originalPrice: true, images: true, stock: true, isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return items.filter((item) => item.product.isActive).map((item) => ({
    ...item.product,
    _id: item.product.id,
    wishlistId: item.id,
  }));
};

export const addToWishlist = async (userId: string, productId: string) => {
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
  if (!product) throw ApiError.notFound('Không tìm thấy sản phẩm');
  await prisma.wishlist.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });
  return { message: 'Đã thêm vào danh sách yêu thích' };
};

export const removeFromWishlist = async (userId: string, productId: string) => {
  await prisma.wishlist.deleteMany({ where: { userId, productId } });
  return { message: 'Đã xóa khỏi danh sách yêu thích' };
};

export const syncWishlist = async (userId: string, productIds: string[]) => {
  if (!Array.isArray(productIds) || productIds.length > 500) throw ApiError.badRequest('Danh sách yêu thích không hợp lệ');
  const valid = await prisma.product.findMany({
    where: { id: { in: [...new Set(productIds.filter((id) => typeof id === 'string'))] }, isActive: true },
    select: { id: true },
  });
  if (valid.length) {
    await prisma.wishlist.createMany({
      data: valid.map((product) => ({ userId, productId: product.id })),
      skipDuplicates: true,
    });
  }
  return getWishlist(userId);
};

export const clearWishlist = async (userId: string) => {
  await prisma.wishlist.deleteMany({ where: { userId } });
  return [];
};
