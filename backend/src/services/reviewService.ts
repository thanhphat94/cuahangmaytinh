import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

type CreateReviewInput = {
  productId: string;
  userId: string;
  rating: number;
  comment?: string | null;
};

export const createReview = async ({ productId, userId, rating, comment }: CreateReviewInput) => {
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw ApiError.badRequest('Vui lòng chọn số sao từ 1 đến 5');
  }
  const text = (comment ?? '').toString().trim();
  if (text.length > 1000) throw ApiError.badRequest('Nội dung đánh giá tối đa 1000 ký tự');

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw ApiError.notFound('Không tìm thấy sản phẩm');

  // Mỗi người chỉ đánh giá 1 lần cho mỗi sản phẩm (ràng buộc unique trong DB)
  const existed = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
    select: { id: true },
  });
  if (existed) throw ApiError.badRequest('Bạn đã đánh giá sản phẩm này rồi');

  const review = await prisma.review.create({
    data: { productId, userId, rating: stars, comment: text || null },
  });
  // isApproved mặc định false → chờ admin duyệt mới hiện công khai
  return { ...review, _id: review.id, message: 'Cảm ơn bạn! Đánh giá đã được gửi và đang chờ duyệt.' };
};

export const getProductReviews = async (productId: string) => {
  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reviews.map((r) => {
    // _id shim: đổi userId sang object embed, bỏ key `user` (như bản JS gốc)
    const { user, ...rest } = r;
    return { ...rest, _id: r.id, userId: { ...user, _id: user.id } };
  });
};

export const approveReview = async (id: string) => {
  const review = await prisma.review.update({
    where: { id },
    data: { isApproved: true },
  });
  return { ...review, _id: review.id };
};

export const deleteReview = async (id: string) => {
  const review = await prisma.review.delete({
    where: { id },
  });
  return { ...review, _id: review.id };
};
