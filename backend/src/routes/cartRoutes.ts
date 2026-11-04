import { Router } from 'express';
import { addToCart, clearCart, getCart, removeFromCart, syncCart, updateCart } from '../controllers/cartController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Toàn bộ các route giỏ hàng đều yêu cầu phải đăng nhập (bảo vệ bởi middleware protect)
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.post('/sync', syncCart);
router.delete('/clear', clearCart);
router.put('/:productId', updateCart);
router.delete('/:productId', removeFromCart);

export default router;