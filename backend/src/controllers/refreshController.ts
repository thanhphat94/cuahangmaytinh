import { prisma } from '../config/db';
import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../helpers/generateToken';
import { hashOpaqueToken, safeTokenEquals } from '../helpers/tokenHash';

export const refreshToken = catchAsync(async (req, res) => {
  const clientRefreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
  if (!clientRefreshToken || clientRefreshToken.length > 4096) throw ApiError.badRequest('Thiếu refresh token');

  let decoded: ReturnType<typeof verifyRefreshToken>;
  try { decoded = verifyRefreshToken(clientRefreshToken); }
  catch { throw ApiError.unauthorized('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'); }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, isActive: true, tokenVersion: true, refreshTokenHash: true },
  });
  if (!user || !user.isActive || user.tokenVersion !== decoded.tokenVersion || !user.refreshTokenHash) {
    throw ApiError.unauthorized('Phiên đăng nhập không còn hiệu lực');
  }

  const suppliedHash = hashOpaqueToken(clientRefreshToken);
  if (!safeTokenEquals(suppliedHash, user.refreshTokenHash)) throw ApiError.unauthorized('Refresh token đã được sử dụng hoặc không hợp lệ');

  const newAccessToken = generateToken(user.id, user.tokenVersion);
  const newRefreshToken = generateRefreshToken(user.id, user.tokenVersion);
  const rotated = await prisma.user.updateMany({
    where: { id: user.id, tokenVersion: user.tokenVersion, refreshTokenHash: user.refreshTokenHash, isActive: true },
    data: { refreshTokenHash: hashOpaqueToken(newRefreshToken) },
  });
  if (rotated.count !== 1) throw ApiError.unauthorized('Phiên đăng nhập vừa được làm mới ở nơi khác. Vui lòng đăng nhập lại.');

  res.json({ token: newAccessToken, refreshToken: newRefreshToken });
});
