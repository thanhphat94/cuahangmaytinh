import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  deleteImage,
  uploadImage,
  uploadMultiple,
} from '../controllers/uploadController';
import { admin, protect } from '../middlewares/authMiddleware';
import { handleUploadError, upload } from '../middlewares/uploadMiddleware';

const router = Router();
let activeUploadRequests = 0;
const MAX_ACTIVE_UPLOADS = 2;
const limitConcurrentUploads = (_req: Request, res: Response, next: NextFunction) => {
  if (activeUploadRequests >= MAX_ACTIVE_UPLOADS) {
    return res.status(429).json({ message: 'Hệ thống đang xử lý ảnh khác. Vui lòng thử lại sau.' });
  }
  activeUploadRequests += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeUploadRequests = Math.max(0, activeUploadRequests - 1);
  };
  res.once('finish', release);
  res.once('close', release);
  next();
};

router.post('/', protect, admin, limitConcurrentUploads, upload.single('image'), handleUploadError, uploadImage);
router.post('/multiple', protect, admin, limitConcurrentUploads, upload.array('images', 10), handleUploadError, uploadMultiple);
router.delete('/:filename', protect, admin, deleteImage);

export default router;
