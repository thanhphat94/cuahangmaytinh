import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';
import catchAsync from '../helpers/catchAsync';
import { verifyToken } from '../helpers/generateToken';

const USER_FIELDS = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  avatar: true,
  isActive: true,
  tokenVersion: true,
} as const;

const protect = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Chưa đăng nhập, vui lòng đăng nhập lại');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: USER_FIELDS,
  });
  if (!user) throw ApiError.unauthorized('Tài khoản không còn tồn tại');
  if (!user.isActive) throw ApiError.unauthorized('Tài khoản đã bị khoá');
  if (decoded.tokenVersion !== user.tokenVersion) throw ApiError.unauthorized('Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại');

  req.user = { ...user, _id: user.id };
  next();
});

const admin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin') return next();
  next(ApiError.forbidden('Bạn không có quyền admin'));
};

const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  if (!authHeader.startsWith('Bearer ')) return next(ApiError.unauthorized('Header xác thực không hợp lệ'));

  try {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: USER_FIELDS,
    });
    if (!user) return next(ApiError.unauthorized('Tài khoản không còn tồn tại'));
    if (!user.isActive) return next(ApiError.unauthorized('Tài khoản đã bị khoá'));
    if (decoded.tokenVersion !== user.tokenVersion) return next(ApiError.unauthorized('Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại'));
    req.user = { ...user, _id: user.id };
    return next();
  } catch (error) {
    return next(error);
  }
};

export { protect, admin, optionalAuth };
