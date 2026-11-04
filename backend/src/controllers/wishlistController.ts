import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import * as wishlistService from '../services/wishlistService';

const requireUserId = (req: { user?: { id: string } }): string => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  return userId;
};

export const getWishlist = catchAsync(async (req, res) => {
  res.json(await wishlistService.getWishlist(requireUserId(req)));
});

export const addToWishlist = catchAsync(async (req, res) => {
  const { productId } = req.body as { productId?: string };
  if (!productId) throw ApiError.badRequest('Thiếu productId');
  res.json(await wishlistService.addToWishlist(requireUserId(req), productId));
});

export const removeFromWishlist = catchAsync(async (req, res) => {
  res.json(await wishlistService.removeFromWishlist(requireUserId(req), req.params.productId));
});

export const syncWishlist = catchAsync(async (req, res) => {
  const { productIds } = req.body as { productIds?: string[] };
  res.json(await wishlistService.syncWishlist(requireUserId(req), productIds ?? []));
});

export const clearWishlist = catchAsync(async (req, res) => {
  res.json(await wishlistService.clearWishlist(requireUserId(req)));
});
