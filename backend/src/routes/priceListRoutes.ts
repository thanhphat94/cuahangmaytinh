import multer from 'multer';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  createPriceList,
  deletePriceList,
  downloadPriceList,
  listPriceLists,
} from '../controllers/priceListController';
import { admin, protect } from '../middlewares/authMiddleware';
import { uploadPriceList } from '../middlewares/priceListUpload';

// Bắt lỗi multer (file quá lớn...) trả về JSON dễ đọc
const handleUpload: RequestHandler = (req, res, next) => {
  uploadPriceList.single('file')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'File quá lớn, tối đa 10MB' });
      return;
    }
    next(err);
  });
};

const router = Router();

router.get('/', listPriceLists);                      // ai cũng xem được
router.get('/:id/download', downloadPriceList);       // ai cũng tải được
router.post('/', protect, admin, handleUpload, createPriceList); // upload: phải đăng nhập admin
router.delete('/:id', protect, admin, deletePriceList);

export default router;
