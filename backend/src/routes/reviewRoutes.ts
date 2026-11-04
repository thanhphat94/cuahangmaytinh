import { Router } from 'express';
import {
  approveReview,
  createReview,
  deleteReview,
  getProductReviews,
} from '../controllers/reviewController';
import { admin, protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', protect, createReview);
router.get('/product/:productId', getProductReviews);
router.put('/:id/approve', protect, admin, approveReview);
router.delete('/:id', protect, admin, deleteReview);

export default router;
