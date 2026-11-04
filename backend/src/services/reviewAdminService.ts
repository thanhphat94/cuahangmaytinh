import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

type ReviewListQuery = {
  approved?: string;
  search?: string;
};

export const getReviews = async ({ approved, search }: ReviewListQuery) => {
  const where: Prisma.ReviewWhereInput = {};
  if (approved === 'true') where.isApproved = true;
  if (approved === 'false') where.isApproved = false;
  if (search) {
    where.OR = [
      { comment: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  const reviews = await prisma.review.findMany({
    where,
    include: {
      user: { select: { id: true, fullName: true } },
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return reviews.map((r) => ({
    ...r,
    _id: r.id,
    userId: r.user ? { ...r.user, _id: r.user.id } : r.userId,
    productId: r.product ? { ...r.product, _id: r.product.id } : r.productId,
  }));
};
