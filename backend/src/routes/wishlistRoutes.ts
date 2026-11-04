import { Router } from 'express';
import {
  addToWishlist,
  clearWishlist,
  getWishlist,
  removeFromWishlist,
  syncWishlist,
} from '../controllers/wishlistController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);
router.get('/', getWishlist);
router.post('/', addToWishlist);
router.post('/sync', syncWishlist);
router.delete('/', clearWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
