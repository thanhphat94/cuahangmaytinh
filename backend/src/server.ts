import 'dotenv/config';
import path from 'path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { connectDB } from './config/db';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/errorMiddleware';
import addressRoutes from './routes/addressRoutes';
import adminRoutes from './routes/adminRoutes';
import bannerRoutes from './routes/bannerRoutes';
import cartRoutes from './routes/cartRoutes';
import categoryRoutes from './routes/categoryRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import contactRoutes from './routes/contactRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import pcBuildRoutes from './routes/pcBuildRoutes';
import postRoutes from './routes/postRoutes';
import priceListRoutes from './routes/priceListRoutes';
import productRoutes from './routes/productRoutes';
import reviewRoutes from './routes/reviewRoutes';
import seedRoutes from './routes/seedRoutes';
import settingsRoutes from './routes/settingsRoutes';
import uploadRoutes from './routes/uploadRoutes';
import userRoutes from './routes/userRoutes';
import voucherRoutes from './routes/voucherRoutes';
import webhookRoutes from './routes/webhookRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import { bootstrapDemoData } from './services/bootstrapService';
import { expireStaleUnpaidOrders } from './services/orderService';

const app = express();
app.disable('x-powered-by');
// Chỉ tin proxy loopback (Cloudflared trên cùng máy), không tin X-Forwarded-* từ client trực tiếp.
app.set('trust proxy', 'loopback');

// Không ghi query string vào access log vì URL reset password có thể chứa token.
app.use(morgan(':method :status :response-time ms :res[content-length]'));

// ─── Bảo mật ─────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: env.isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Order-Token'],
  maxAge: 600,
}));

// Tầng giới hạn tổng thể và giới hạn riêng cho tài nguyên tốn CPU/RAM.
const apiLimiter = rateLimit({ skip: () => !env.isProduction, windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { message: 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' } });
const chatbotLimiter = rateLimit({ skip: () => !env.isProduction, windowMs: 5 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { message: 'Bạn đã hỏi quá nhanh. Vui lòng chờ một chút rồi thử lại.' } });
const uploadLimiter = rateLimit({ skip: () => !env.isProduction, windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Đã đạt giới hạn tải ảnh. Vui lòng thử lại sau.' } });
const webhookLimiter = rateLimit({ skip: () => !env.isProduction, windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { message: 'Webhook vượt giới hạn yêu cầu.' } });

// Tách rate limit — chặt cho auth/order, thoáng cho browse
const strictLimiter = rateLimit({
  skip: () => !env.isProduction, // dev/test: không giới hạn
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' },
  standardHeaders: true,
  legacyHeaders: false,
});

const browseLimiter = rateLimit({
  skip: () => !env.isProduction, // dev/test: không giới hạn
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/chatbot', chatbotLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api/webhook', webhookLimiter);

app.use('/api/users/login', strictLimiter);
app.use('/api/users/register', strictLimiter);
app.use('/api/orders', strictLimiter);

app.use('/api/products', browseLimiter);
app.use('/api/categories', browseLimiter);
app.use('/api/banners', browseLimiter);
app.use('/api/settings', browseLimiter);

// ─── Body parsing ────────────────────────────────────────
// API không cần compressed request body; từ chối để tránh rủi ro decompression/parser DoS.
app.use((req, res, next) => {
  const encoding = (req.headers['content-encoding'] || 'identity').trim().toLowerCase();
  if (encoding !== 'identity') return res.status(415).json({ message: 'Request nén không được hỗ trợ.' });
  next();
});
app.use(express.json({ limit: '1mb', inflate: false, strict: true }));
app.use(express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 100, inflate: false }));

// ─── Kết nối DB ──────────────────────────────────────────
void connectDB();

// ─── Health check ────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'CuaHangMayTinh API is running' });
});

// ─── Seed dữ liệu (chỉ dùng khi dev) ─────────────────────
if (env.isDevelopment && process.env.ENABLE_DEV_SEED === 'true' && process.env.DEV_SEED_SECRET) {
  app.use('/api', seedRoutes);
}

// ─── Routes ──────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/pcbuilds', pcBuildRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/price-lists', priceListRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Serve ảnh upload tĩnh
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Webhook (đơn vị vận chuyển callback) ────────────────
app.use('/api/webhook', webhookRoutes);

// ─── Error handling ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// Chỉ bind loopback: Cloudflare Tunnel chạy trên cùng máy vẫn truy cập được, LAN/Internet không gọi thẳng port backend.
app.listen(env.port, '127.0.0.1', () => {
  console.log(` Server [${env.nodeEnv}] running on http://localhost:${env.port}`);
  void bootstrapDemoData();

  // Thu hồi tồn kho/voucher cho đơn online bị bỏ dở; COD không bị tự huỷ.
  const expiryTimer = setInterval(() => {
    void expireStaleUnpaidOrders()
      .then((count) => { if (count > 0) console.log(`🧹 Đã tự huỷ ${count} đơn quá hạn thanh toán`); })
      .catch((error: unknown) => console.error('Order expiry worker failed:', error instanceof Error ? error.message : String(error)));
  }, 5 * 60 * 1000);
  expiryTimer.unref?.();
  void expireStaleUnpaidOrders().catch((error: unknown) => {
    console.error('Initial order expiry check failed:', error instanceof Error ? error.message : String(error));
  });
});
