/**
 * Cấu hình môi trường có kiểu.
 *
 * Đọc `process.env` trực tiếp trong strict mode trả về `string | undefined`,
 * vì vậy mọi biến bắt buộc được kiểm tra ngay lúc khởi động (common/security.md).
 */
import 'dotenv/config';

const optional = (key: string): string => process.env[key] ?? '';

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${key}. Kiểm tra backend/.env (xem .env.example).`);
  }
  return value;
};

const withDefault = (key: string, fallback: string): string => process.env[key] || fallback;

const nodeEnv = withDefault('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';
const jwtSecret = required('JWT_SECRET');
const configuredRefreshSecret = optional('JWT_REFRESH_SECRET');
const refreshSecret = configuredRefreshSecret || (isProduction ? '' : jwtSecret);
const clientUrl = withDefault('CLIENT_URL', 'http://localhost:3000');
const clientOrigins = clientUrl.split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean);
const backendUrl = withDefault('BACKEND_URL', `http://localhost:${withDefault('PORT', '5000')}`).replace(/\/$/, '');
const accessTokenTtl = withDefault('JWT_EXPIRES_IN', isProduction ? '15m' : '7d');
const refreshTokenTtl = withDefault('JWT_REFRESH_EXPIRES_IN', '30d');
const accessTtlMatch = accessTokenTtl.match(/^(\d+)(s|m|h|d)$/i);
const ttlUnitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
const accessTtlMs = accessTtlMatch ? Number(accessTtlMatch[1]) * ttlUnitMs[accessTtlMatch[2].toLowerCase() as keyof typeof ttlUnitMs] : Number.POSITIVE_INFINITY;
const refreshTtlMatch = refreshTokenTtl.match(/^(\d+)(s|m|h|d)$/i);
const refreshTtlMs = refreshTtlMatch ? Number(refreshTtlMatch[1]) * ttlUnitMs[refreshTtlMatch[2].toLowerCase() as keyof typeof ttlUnitMs] : Number.POSITIVE_INFINITY;
const isHttpsOrigin = (value: string): boolean => {
  try { const parsed = new URL(value); return parsed.protocol === 'https:' && parsed.origin === value && !parsed.username && !parsed.password; }
  catch { return false; }
};

if (isProduction) {
  if (jwtSecret.length < 32 || /replace_with|change_me|your_secret/i.test(jwtSecret)) {
    throw new Error('JWT_SECRET production phải có ít nhất 32 ký tự ngẫu nhiên.');
  }
  if (!refreshSecret || refreshSecret.length < 32 || refreshSecret === jwtSecret || /replace_with|change_me|your_secret/i.test(refreshSecret)) {
    throw new Error('JWT_REFRESH_SECRET production phải có ít nhất 32 ký tự ngẫu nhiên và khác JWT_SECRET.');
  }
  if (!accessTtlMatch || accessTtlMs > 60 * 60 * 1000) {
    throw new Error('JWT_EXPIRES_IN production phải là thời hạn tối đa 1 giờ (khuyến nghị 15m).');
  }
  if (clientOrigins.length === 0 || clientOrigins.some((origin) => !isHttpsOrigin(origin))) {
    throw new Error('CLIENT_URL production phải là danh sách origin HTTPS hợp lệ, không kèm path, phân tách bằng dấu phẩy.');
  }
  if (!isHttpsOrigin(backendUrl)) {
    throw new Error('BACKEND_URL production phải là origin HTTPS công khai của API.');
  }
  if (!refreshTtlMatch || refreshTtlMs > 90 * 24 * 60 * 60 * 1000) {
    throw new Error('JWT_REFRESH_EXPIRES_IN production phải hợp lệ và không quá 90 ngày (khuyến nghị 30d).');
  }
}

export const env = {
  nodeEnv,
  isProduction,
  isDevelopment: nodeEnv === 'development',
  port: Number(withDefault('PORT', '5000')),

  clientUrl: clientOrigins[0] || clientUrl,
  clientOrigins,
  backendUrl,

  jwt: {
    secret: jwtSecret,
    expiresIn: accessTokenTtl,
    refreshSecret,
    refreshExpiresIn: refreshTokenTtl,
  },

  smtp: {
    host: optional('SMTP_HOST'),
    port: Number(optional('SMTP_PORT')) || 587,
    secure: optional('SMTP_SECURE') === 'true',
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
  },

  cloudinary: {
    cloudName: optional('CLOUDINARY_CLOUD_NAME'),
    apiKey: optional('CLOUDINARY_API_KEY'),
    apiSecret: optional('CLOUDINARY_API_SECRET'),
    get isEnabled(): boolean {
      return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
      );
    },
  },

  /**
   * PAYMENT_MODE:
   *  - 'mock' : cổng thanh toán GIẢ LẬP (trang MoMo/VNPay mô phỏng + mã QR giả), mặc định mọi môi trường.
   *  - 'live' : chỉ cho phép trong development; production luôn khóa ở chế độ mock theo yêu cầu dự án.
   */
  /**
   * SEED_DEMO_DATA=true: chỉ tạo dữ liệu demo khi development.
   * Production luôn tắt seed demo kể cả khi .env vô tình đặt true.
   */
  // Không bao giờ seed dữ liệu demo trong production, kể cả khi .env vô tình đặt true.
  seedDemoData: !isProduction && withDefault('SEED_DEMO_DATA', 'true') === 'true',

  payment: {
    // Giữ checkout mô phỏng trên production theo yêu cầu đồ án; không bật merchant thật chỉ vì .env cũ.
    mode: (!isProduction && withDefault('PAYMENT_MODE', 'mock') === 'live' ? 'live' : 'mock') as 'mock' | 'live',
  },

  vnpay: {
    tmnCode: optional('VNPAY_TMN_CODE'),
    hashSecret: optional('VNPAY_HASH_SECRET'),
  },

  momo: {
    partnerCode: optional('MOMO_PARTNER_CODE'),
    accessKey: optional('MOMO_ACCESS_KEY'),
    secretKey: optional('MOMO_SECRET_KEY'),
  },

  ollama: {
    // Ollama phải truy cập được từ chính máy/môi trường đang chạy backend.
    baseUrl: withDefault('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').replace(/\/+$/, ''),
    model: withDefault('OLLAMA_MODEL', 'qwen2.5:3b'),
    timeoutMs: Math.max(30_000, Number(withDefault('OLLAMA_TIMEOUT_MS', '180000')) || 180_000),
  },
} as const;
