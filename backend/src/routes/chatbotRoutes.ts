import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { recommend, chat, health } from '../controllers/chatbotController';

import { env } from '../config/env';
const router = Router();
const recommendLimiter = rateLimit({ skip: () => !env.isProduction, windowMs: 5 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Bạn gửi quá nhiều yêu cầu tư vấn. Vui lòng thử lại sau.' } });

router.get('/health', health);
router.post('/recommend', recommendLimiter, recommend);
router.post('/message', chat);

export default router;
