import { Router } from 'express';
import { cancelGuestOrder, cancelOrder, createOrder, getGuestOrders, getOrderById, getMyOrders } from '../controllers/orderController';
import { optionalAuth, protect } from '../middlewares/authMiddleware';
import { createOrderRules } from '../validators/orderValidator';
import validate from '../middlewares/validate';

const router = Router();

router.post('/', optionalAuth, createOrderRules, validate, createOrder);
router.get('/myorders', protect, getMyOrders);
router.post('/guest/status', optionalAuth, getGuestOrders);
router.put('/:id/cancel', protect, cancelOrder);
// Guest cancellation is authorized only by the unguessable guestAccessToken issued with the order.
router.put('/:id/cancel-guest', optionalAuth, cancelGuestOrder);
router.get('/:id', optionalAuth, getOrderById);

export default router;
