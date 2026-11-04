import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import ApiError from '../helpers/ApiError';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE      = 5 * 1024 * 1024; // 5MB

/**
 * `@types/multer` khai báo `FileFilterCallback` dạng overload — `(error)` HOẶC
 * `(error: null, acceptFile: boolean)` — trong khi runtime của multer bỏ qua
 * `acceptFile` khi đã có error (node_modules/multer/lib/make-middleware.js:109).
 * Kiểu dưới đây giữ nguyên được cả hai cách gọi của bản JS gốc.
 */
type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(ApiError.badRequest('Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF'), false);
};

// Luôn dùng memoryStorage — buffer được xử lý trong controller
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 10, fields: 10, parts: 20, fieldNameSize: 100, fieldSize: 64 * 1024 },
});

/** File sau khi qua Cloudinary (`public_id`) hoặc qua local disk (`savedFilename`) */
type UploadFile = Express.Multer.File & {
  cloudinaryUrl?: string;
  savedFilename?: string;
  public_id?: string;
};

// Chuẩn hoá response từ cả Cloudinary lẫn local
export const normalizeFile = (file: UploadFile) => ({
  url:      file.cloudinaryUrl || `/uploads/${file.savedFilename}`,
  filename: file.savedFilename || file.public_id || file.originalname,
  size:     file.size,
});

export const handleUploadError = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ message: 'File quá lớn, tối đa 5MB' });
    return res.status(400).json({ message: `Lỗi upload: ${err.message}` });
  }
  next(err);
};
