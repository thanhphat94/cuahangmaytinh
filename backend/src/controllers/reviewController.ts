import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import * as reviewService from '../services/reviewService';

export const createReview = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const { productId, rating, comment } = req.body as {
    productId: string;
    rating: number;
    comment?: string | null;
  };

  const review = await reviewService.createReview({ productId, userId, rating, comment });
  res.status(201).json(review);
});

export const getProductReviews = catchAsync(async (req, res) => {
  const reviews = await reviewService.getProductReviews(req.params.productId);
  res.json(reviews);
});

export const approveReview = catchAsync(async (req, res) => {
  const review = await reviewService.approveReview(req.params.id);
  if (!review) throw ApiError.notFound('Không tìm thấy review');
  res.json(review);
});

export const deleteReview = catchAsync(async (req, res) => {
  const review = await reviewService.deleteReview(req.params.id);
  if (!review) throw ApiError.notFound('Không tìm thấy review');
  res.json({ message: 'Đã xóa review' });
});
