import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ApiError from '../helpers/ApiError';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import catchAsync from '../helpers/catchAsync';

type UploadResult = { url: string; filename: string };
type DetectedImage = { mime: string; extension: string };

const detectImage = (buffer: Buffer): DetectedImage | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', extension: '.jpg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', extension: '.png' };
  if (buffer.length >= 6 && (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a')) return { mime: 'image/gif', extension: '.gif' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', extension: '.webp' };
  return null;
};

// ─── Helper: lưu buffer ra disk (development) ──────────────
const saveToDisk = (file: Express.Multer.File, extension: string): UploadResult => {
  const UPLOAD_DIR = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}${extension}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return { url: `/uploads/${filename}`, filename };
};

// ─── Helper: upload buffer lên Cloudinary v2 (production) ──
const uploadToCloudinary = (file: Express.Multer.File): Promise<UploadResult> => {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'cuahangmaytinh',
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload thất bại'));
        resolve({ url: result.secure_url, filename: result.public_id });
      }
    );
    stream.end(file.buffer);
  });
};

// ─── Xử lý 1 file ──────────────────────────────────────────
const processFile = async (file: Express.Multer.File): Promise<UploadResult> => {
  const detected = detectImage(file.buffer);
  if (!detected) throw ApiError.badRequest('Tệp tải lên không phải ảnh JPG, PNG, WebP hoặc GIF hợp lệ');
  const declared = file.mimetype.toLowerCase();
  const compatible = declared === detected.mime || (declared === 'image/jpg' && detected.mime === 'image/jpeg');
  if (!compatible) throw ApiError.badRequest('Định dạng ảnh không khớp nội dung tệp');
  if (env.cloudinary.isEnabled) return uploadToCloudinary(file);
  return saveToDisk(file, detected.extension);
};

// POST /api/upload — 1 ảnh
export const uploadImage = catchAsync(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Không có file được upload' });
  const result = await processFile(req.file);
  res.status(201).json(result);
});

// POST /api/upload/multiple — nhiều ảnh
export const uploadMultiple = catchAsync(async (req, res) => {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ message: 'Không có file' });
  }
  const results = await Promise.all(req.files.map(processFile));
  res.status(201).json(results);
});

// DELETE /api/upload/:filename
export const deleteImage = catchAsync(async (req, res) => {
  const { filename } = req.params;
  const isLocalName = /^[a-f0-9-]{36}\.(jpg|png|gif|webp)$/i.test(filename);
  const isCloudinaryName = /^cuahangmaytinh\/[a-z0-9_-]{1,100}$/i.test(filename);
  if (env.cloudinary.isEnabled) {
    if (!isCloudinaryName) return res.status(400).json({ message: 'Tên ảnh không hợp lệ' });
    cloudinary.config({ cloud_name: env.cloudinary.cloudName, api_key: env.cloudinary.apiKey, api_secret: env.cloudinary.apiSecret });
    await cloudinary.uploader.destroy(filename);
    return res.json({ message: 'Đã xóa ảnh' });
  }
  if (!isLocalName) return res.status(400).json({ message: 'Tên file không hợp lệ' });
  const filePath = path.join(__dirname, '../../uploads', filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ message: 'Đã xóa ảnh' });
});
