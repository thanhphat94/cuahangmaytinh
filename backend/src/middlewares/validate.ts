import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import ApiError from '../helpers/ApiError';

const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(ApiError.badRequest(message));
  }
  next();
};

export default validate;
