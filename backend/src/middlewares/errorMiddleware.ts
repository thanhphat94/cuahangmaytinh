
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import ApiError from '../helpers/ApiError';
import { env } from '../config/env';

/** Error có thể mang statusCode. */
interface HttpError extends Error {
  statusCode?: number;
}

// Middleware xử lý route không tồn tại.
const notFound = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(ApiError.notFound('Không tìm thấy tài nguyên yêu cầu'));
};

const toHttpError = (err: unknown): HttpError => {
  if (!(err instanceof Error)) {
    return ApiError.internal(
      env.isProduction
        ? 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
        : String(err)
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const fields = err.meta?.target;
        const fieldName = Array.isArray(fields)
          ? fields.join(', ')
          : 'Trường';

        return ApiError.badRequest(`${fieldName} đã tồn tại`);
      }

      case 'P2025':
        return ApiError.notFound('Bản ghi không tồn tại');

      case 'P2003':
        return ApiError.badRequest('Dữ liệu liên kết không hợp lệ');

      case 'P2014':
        return ApiError.badRequest('Vi phạm ràng buộc quan hệ dữ liệu');

      default:
        return ApiError.internal('Không thể xử lý yêu cầu lúc này');
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return ApiError.badRequest('Dữ liệu không hợp lệ');
  }

  // Chuẩn hóa lỗi multipart và body parser.
  const errorLike = err as Error & {
    code?: string;
    type?: string;
    status?: number;
  };

  if (errorLike.name === 'MulterError') {
    if (errorLike.code === 'LIMIT_FILE_SIZE') {
      return ApiError.badRequest(
        'Ảnh tải lên vượt quá giới hạn 5MB'
      );
    }

    return ApiError.badRequest(
      'Tệp tải lên không hợp lệ hoặc vượt giới hạn cho phép'
    );
  }

  if (errorLike.type === 'entity.too.large') {
    return Object.assign(
      ApiError.badRequest('Dữ liệu gửi lên quá lớn'),
      { statusCode: 413 }
    );
  }

  if (errorLike.type === 'entity.parse.failed') {
    return ApiError.badRequest('Dữ liệu JSON không hợp lệ');
  }

  if (errorLike.type === 'encoding.unsupported') {
    return Object.assign(
      ApiError.badRequest('Định dạng request không được hỗ trợ'),
      { statusCode: 415 }
    );
  }

  if (err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Token không hợp lệ');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized(
      'Token đã hết hạn, vui lòng đăng nhập lại'
    );
  }

  if (env.isProduction && !(err instanceof ApiError)) {
    return ApiError.internal(
      'Đã xảy ra lỗi. Vui lòng thử lại sau.'
    );
  }

  return err;
};

const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Lỗi không phải ApiError (Prisma, bug...) bị che thành thông báo chung → luôn log ra console server.
  if (!(err instanceof ApiError)) console.error('[error]', err);
  const error = toHttpError(err);

  const statusCode =
    error instanceof ApiError
      ? error.statusCode
      : (error.statusCode ?? 500);

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Lỗi server',
    ...(env.isDevelopment && { stack: error.stack }),
  });
};

export { notFound, errorHandler };
