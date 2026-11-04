import crypto from 'crypto';

/** Lưu token dưới dạng SHA-256; token gốc chỉ trả về cho client một lần. */
export const hashOpaqueToken = (token: string): string =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

export const safeTokenEquals = (left: string, right: string): boolean => {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};
