import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Bọc promise của controller để error tự đẩy xuống `errorHandler`.
 * Giữ nguyên hành vi CommonJS cũ nhưng có kiểu req/res đầy đủ.
 */
const catchAsync =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default catchAsync;
