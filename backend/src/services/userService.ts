import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { env } from '../config/env';
import ApiError from '../helpers/ApiError';
import { generateRefreshToken, generateToken } from '../helpers/generateToken';
import { hashOpaqueToken, safeTokenEquals } from '../helpers/tokenHash';

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
};

type LoginInput = {
  email: string;
  password: string;
};

type UpdateProfileInput = {
  fullName?: string;
  phone?: string | null;
  avatar?: string | null;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

const isBcryptHash = (password: string): boolean =>
  typeof password === 'string' && /^\$2[aby]\$/.test(password);

// Mật khẩu bcrypt → so sánh bình thường.
// Dữ liệu cũ lưu chưa băm (seed/import thủ công) → so sánh an toàn thời gian-hằng-số;
// nếu khớp, loginUser sẽ tự nâng cấp lên bcrypt ngay sau đó.
const matchPassword = async (entered: string, stored: string): Promise<boolean> => {
  if (isBcryptHash(stored)) return bcrypt.compare(entered, stored);
  return safeTokenEquals(entered, stored);
};

export const registerUser = async ({ fullName, email, password, phone }: RegisterInput) => {
  if (Buffer.byteLength(password, 'utf8') > 72) throw ApiError.badRequest('Mật khẩu quá dài. Vui lòng dùng tối đa 72 byte UTF-8.');
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw ApiError.badRequest('Email đã được sử dụng');

  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(password, salt);
  const user = await prisma.user.create({
    data: { fullName, email, password: hashed, phone },
  });

  const token = generateToken(user.id, user.tokenVersion);
  const refreshToken = generateRefreshToken(user.id, user.tokenVersion);
  // Mỗi tài khoản chỉ giữ một refresh session hoạt động; đăng nhập mới sẽ thu hồi refresh session cũ.
  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: hashOpaqueToken(refreshToken) } });
  return { _id: user.id, fullName: user.fullName, email: user.email, role: user.role, token, refreshToken };
};

export const loginUser = async ({ email, password }: LoginInput) => {
  if (Buffer.byteLength(password, 'utf8') > 72) throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
  // Tìm email không phân biệt hoa/thường để không lỡ tài khoản tạo thủ công/seed có chữ hoa.
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (!user) {
    if (!env.isProduction) console.warn(`[login] Không tìm thấy tài khoản: ${email}`);
    throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
  }
  if (!(await matchPassword(password, user.password))) {
    if (!env.isProduction) console.warn(`[login] Sai mật khẩu cho: ${email} (mật khẩu trong DB ${isBcryptHash(user.password) ? 'là bcrypt' : 'KHÔNG phải bcrypt'})`);
    throw ApiError.unauthorized('Email hoặc mật khẩu không đúng');
  }
  if (!user.isActive) throw ApiError.forbidden('Tài khoản đã bị khoá');

  // Nâng cấp mật khẩu cũ (chưa băm) lên bcrypt ngay khi đăng nhập thành công.
  const upgradedPassword = isBcryptHash(user.password) ? undefined : await bcrypt.hash(password, 12);

  // Mỗi lần đăng nhập tạo phiên mới và vô hiệu hóa access/refresh token ở thiết bị đăng nhập trước.
  const session = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 }, ...(upgradedPassword && { password: upgradedPassword }) },
    select: { tokenVersion: true },
  });
  const token = generateToken(user.id, session.tokenVersion);
  const refreshToken = generateRefreshToken(user.id, session.tokenVersion);
  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: hashOpaqueToken(refreshToken) } });
  return { _id: user.id, fullName: user.fullName, email: user.email, role: user.role, avatar: user.avatar, token, refreshToken };
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, fullName: true, email: true, phone: true,
      role: true, avatar: true, isActive: true, createdAt: true, updatedAt: true,
    },
  });
  if (!user) throw ApiError.notFound('Không tìm thấy user');
  return { ...user, _id: user.id };
};

export const updateUserProfile = async (userId: string, { fullName, phone, avatar }: UpdateProfileInput) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { fullName, phone, avatar },
    select: {
      id: true, fullName: true, email: true, phone: true,
      role: true, avatar: true, isActive: true, createdAt: true, updatedAt: true,
    },
  });
  return { ...user, _id: user.id };
};

export const changePassword = async (userId: string, { currentPassword, newPassword }: ChangePasswordInput) => {
  if (Buffer.byteLength(currentPassword, 'utf8') > 72 || Buffer.byteLength(newPassword, 'utf8') > 72) throw ApiError.badRequest('Mật khẩu không hợp lệ.');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  const isMatch = await matchPassword(currentPassword, user.password);
  if (!isMatch) throw ApiError.badRequest('Mật khẩu hiện tại không đúng');

  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(newPassword, salt);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed, tokenVersion: { increment: 1 }, refreshTokenHash: null } });
  return { message: 'Đổi mật khẩu thành công' };
};


export const logoutUser = async (userId: string) => {
  await prisma.user.updateMany({ where: { id: userId }, data: { refreshTokenHash: null, tokenVersion: { increment: 1 } } });
  return { message: 'Đăng xuất thành công' };
};
