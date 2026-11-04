import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createPaymentUrl, getPaymentStatus, mockConfirmPayment, momoIPN, momoReturn, vnpayIPN, vnpayReturn } from '../controllers/paymentController';
import { optionalAuth } from '../middlewares/authMiddleware';

import { env } from '../config/env';
const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store, private'); next(); });
const mockPaymentLimiter = rateLimit({ skip: () => !env.isProduction, windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Quá nhiều thao tác thanh toán mô phỏng. Vui lòng thử lại sau.' } });

router.post('/create', optionalAuth, createPaymentUrl);
router.get('/status/:orderCode', optionalAuth, getPaymentStatus);
router.post('/mock/confirm', mockPaymentLimiter, optionalAuth, mockConfirmPayment);
router.get('/vnpay/return', vnpayReturn);
router.get('/vnpay/ipn', vnpayIPN);
router.post('/momo/ipn', momoIPN);
router.get('/momo/return', momoReturn);

export default router;
