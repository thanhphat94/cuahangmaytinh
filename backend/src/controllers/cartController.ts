import type { Request, Response } from 'express';
import ApiError from '../helpers/ApiError';
import catchAsync from '../helpers/catchAsync';
import * as cartService from '../services/cartService';

type AddToCartInput = Parameters<typeof cartService.addToCart>[1];
type UpdateCartItemInput = Parameters<typeof cartService.updateCartItem>[2];
type SyncCartItems = Parameters<typeof cartService.syncCart>[1];

export const getCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Chưa đăng nhập');
  const cart = await cartService.getCart(userId);
  res.json({ success: true, data: cart });
});

export const addToCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Chưa đăng nhập');
  const cart = await cartService.addToCart(userId, req.body as AddToCartInput);
  res.json({ success: true, data: cart });
});

export const updateCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Chưa đăng nhập');
  const cart = await cartService.updateCartItem(
    userId, 
    req.params.productId, 
    req.body as UpdateCartItemInput
  );
  res.json({ success: true, data: cart });
});

export const removeFromCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Chưa đăng nhập');
  const variant = typeof req.query.variant === 'string' ? req.query.variant : undefined;
  const cart = await cartService.removeFromCart(userId, req.params.productId, variant);
  res.json({ success: true, data: cart });
});

export const clearCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Chưa đăng nhập');
  await cartService.clearCart(userId);
  res.json({ success: true, message: 'Đã xóa sạch giỏ hàng', data: [] });
});

export const syncCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized('Chưa đăng nhập');
  const { items } = req.body as { items?: SyncCartItems };
  const cart = await cartService.syncCart(userId, items || []);
  res.json({ success: true, data: cart });
});