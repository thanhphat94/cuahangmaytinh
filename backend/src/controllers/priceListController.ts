import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db';
import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import { PRICELIST_DIR } from '../middlewares/priceListUpload';

// Công khai: danh sách bảng giá (mới nhất lên đầu)
export const listPriceLists = catchAsync(async (_req, res) => {
  const items = await prisma.priceList.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(items);
});

// Công khai: tải file về
export const downloadPriceList = catchAsync(async (req, res) => {
  const item = await prisma.priceList.findUnique({ where: { id: req.params.id } });
  if (!item) throw ApiError.notFound('Không tìm thấy bảng giá');
  const filePath = path.join(PRICELIST_DIR, item.filename);
  if (!fs.existsSync(filePath)) throw ApiError.notFound('File không còn tồn tại trên server');
  res.download(filePath, item.originalName);
});

// Chỉ admin: upload bảng giá mới
export const createPriceList = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Vui lòng chọn file bảng giá');
  // multer đọc tên file theo latin1, đổi lại sang UTF-8 để giữ dấu tiếng Việt
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const { title: rawTitle } = req.body as { title?: string };
  const title = (rawTitle || '').trim() || originalName;

  const item = await prisma.priceList.create({
    data: { title, filename: req.file.filename, originalName, size: req.file.size },
  });
  res.status(201).json(item);
});

// Chỉ admin: xoá bảng giá (xoá cả file)
export const deletePriceList = catchAsync(async (req, res) => {
  const item = await prisma.priceList.findUnique({ where: { id: req.params.id } });
  if (!item) throw ApiError.notFound('Không tìm thấy bảng giá');
  await prisma.priceList.delete({ where: { id: item.id } });
  fs.unlink(path.join(PRICELIST_DIR, item.filename), () => {});
  res.json({ message: 'Đã xoá bảng giá' });
});
