import { Router } from 'express';
import {
  applyVoucher,
  createVoucher,
  deleteVoucher,
  getAdminVouchers,
  getPublicVouchers,
  updateVoucher,
} from '../controllers/voucherController';
import { admin, protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/validate', applyVoucher);
router.get('/', getPublicVouchers);
router.get('/list', protect, admin, getAdminVouchers);
router.post('/admin', protect, admin, createVoucher);
router.put('/admin/:id', protect, admin, updateVoucher);
router.delete('/admin/:id', protect, admin, deleteVoucher);

export default router;
