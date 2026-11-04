import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import type { Request } from 'express';
import ApiError from '../helpers/ApiError';

const DIR = path.join(__dirname, '../../uploads/pricelists');
const ALLOWED_EXT = ['.pdf', '.xls', '.xlsx', '.csv', '.doc', '.docx'];

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileCallbackCallback = (error: Error | null, filename: string) => void;
/**
 * Giống `uploadMiddleware`: overload của `@types/multer` không cho gọi
 * `(error, false)` dù runtime multer bỏ qua `acceptFile` khi đã có error.
 */
type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

// Lưu file thẳng vào ổ đĩa, đặt tên ngẫu nhiên để không bị trùng
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: DestinationCallback) => cb(null, DIR),
  filename: (_req: Request, file: Express.Multer.File, cb: FileCallbackCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.includes(ext)) cb(null, true);
  else cb(ApiError.badRequest('Chỉ chấp nhận file PDF, Excel, CSV hoặc Word'), false);
};

export const uploadPriceList = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

export const PRICELIST_DIR = DIR;
