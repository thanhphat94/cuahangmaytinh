import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from '../controllers/userController';
import {
  forgotPassword,
  resetPassword,
  verifyResetToken,
} from '../controllers/passwordResetController';
import { refreshToken } from '../controllers/refreshController';
import { env } from '../config/env';
import { protect } from '../middlewares/authMiddleware';
import validate from '../middlewares/validate';
import {
  changePasswordRules,
  loginRules,
  registerRules,
} from '../validators/userValidator';

const router = Router();
const noStore = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, private');
  next();
};

const authLimiter = rateLimit({
  skip: () => !env.isProduction, // dev/test: không giới hạn
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Đăng nhập hoặc đăng ký quá nhiều lần, vui lòng thử lại sau 15 phút' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Gom các endpoint phục hồi phiên/mật khẩu vào cùng bộ giới hạn để tránh dò token.
const recoveryLimiter = rateLimit({
  skip: () => !env.isProduction, // dev/test: không giới hạn
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau.' },
});

// Refresh được gọi tự động khi access token hết hạn, nên có ngưỡng riêng rộng hơn.
const refreshLimiter = rateLimit({
  skip: () => !env.isProduction, // dev/test: không giới hạn
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Phiên đăng nhập đang được làm mới quá thường xuyên. Vui lòng đăng nhập lại.' },
});

const passwordChangeLimiter = rateLimit({
  skip: () => !env.isProduction, // dev/test: không giới hạn
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bạn đã thử đổi mật khẩu quá nhiều lần. Vui lòng thử lại sau.' },
});

router.post('/register', authLimiter, noStore, registerRules, validate, registerUser);
router.post('/login', authLimiter, noStore, loginRules, validate, loginUser);
router.post('/logout', protect, noStore, logoutUser);
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.put('/change-password', protect, passwordChangeLimiter, noStore, changePasswordRules, validate, changePassword);
router.post('/refresh-token', refreshLimiter, noStore, refreshToken);
router.post('/forgot-password', recoveryLimiter, noStore, forgotPassword);
router.post('/reset-password', recoveryLimiter, noStore, resetPassword);
router.post('/verify-reset-token', recoveryLimiter, noStore, verifyResetToken);

export default router;
