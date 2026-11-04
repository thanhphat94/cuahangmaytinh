import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import { sendPasswordResetEmail } from '../services/emailService';
import { hashOpaqueToken } from '../helpers/tokenHash';

const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,128}$/;

// POST /api/users/forgot-password
export const forgotPassword = catchAsync(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest('Vui lòng nhập email hợp lệ');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Trả cùng một thông điệp để không tiết lộ email có tồn tại hay không.
  if (!user) return res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.' });

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { userId: user.id, token: tokenHash, expiresAt } });

  try {
    await sendPasswordResetEmail({ to: user.email, fullName: user.fullName, resetToken: token });
  } catch (emailErr: unknown) {
    // Không log token hoặc email link; giữ phản hồi chung để tránh dò tài khoản.
    console.error('Password reset email delivery failed:', emailErr instanceof Error ? emailErr.message : 'unknown error');
  }

  return res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu.' });
});

// POST /api/users/reset-password
export const resetPassword = catchAsync(async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!RESET_TOKEN_PATTERN.test(token) || !PASSWORD_PATTERN.test(newPassword) || Buffer.byteLength(newPassword, 'utf8') > 72) {
    throw ApiError.badRequest('Link hoặc mật khẩu mới không hợp lệ. Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.');
  }

  const now = new Date();
  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashOpaqueToken(token) } });
  if (!record || record.used || record.expiresAt <= now) {
    throw ApiError.badRequest('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, used: false, expiresAt: { gt: now } },
      data: { used: true },
    });
    if (consumed.count !== 1) throw ApiError.badRequest('Link đặt lại mật khẩu đã được sử dụng hoặc hết hạn');
    await tx.user.update({
      where: { id: record.userId },
      data: { password: hashed, tokenVersion: { increment: 1 }, refreshTokenHash: null },
    });
    // Vô hiệu hoá mọi link reset cũ còn tồn tại của tài khoản.
    await tx.passwordResetToken.updateMany({ where: { userId: record.userId, used: false }, data: { used: true } });
  });

  res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
});

// POST /api/users/verify-reset-token — token nằm trong body, không rò qua access log/query string.
export const verifyResetToken = catchAsync(async (req, res) => {
  const rawToken = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!RESET_TOKEN_PATTERN.test(rawToken)) return res.json({ valid: false });
  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashOpaqueToken(rawToken) } });
  res.json({ valid: Boolean(record && !record.used && record.expiresAt > new Date()) });
});
