import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

export type VoucherType = 'percent' | 'flat' | 'freeship';
export type VoucherInput = {
  code: string;
  type: VoucherType;
  value: number;
  label: string;
  minOrder?: number;
  active?: boolean;
  usageLimit?: number | null;
  startsAt?: string | Date | null;
  expiresAt?: string | Date | null;
};

type VoucherValidationResult =
  | { valid: false; error: string }
  | {
      valid: true;
      discountAmount: number;
      freeShip: boolean;
      label: string;
      code: string;
      voucherId: string;
    };

const normalizeCode = (code: string): string => code.trim().toUpperCase();

const parseDate = (value: string | Date | null | undefined, field: string): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw ApiError.badRequest(`${field} không hợp lệ`);
  return parsed;
};

const validateInput = (input: VoucherInput): Prisma.VoucherUncheckedCreateInput => {
  const code = normalizeCode(input.code || '');
  const label = String(input.label || '').trim();
  const type = input.type;
  const value = Number(input.value);
  const minOrder = Number(input.minOrder ?? 0);
  const rawUsageLimit = input.usageLimit as number | null | undefined | '';
  const usageLimit = rawUsageLimit == null || rawUsageLimit === '' ? null : Number(rawUsageLimit);
  const startsAt = parseDate(input.startsAt, 'Ngày bắt đầu');
  const expiresAt = parseDate(input.expiresAt, 'Ngày kết thúc');

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw ApiError.badRequest('Mã voucher phải có 3–40 ký tự A-Z, 0-9, _ hoặc -');
  if (!['percent', 'flat', 'freeship'].includes(type)) throw ApiError.badRequest('Loại voucher không hợp lệ');
  if (!label || label.length > 160) throw ApiError.badRequest('Mô tả voucher không được để trống và tối đa 160 ký tự');
  if (!Number.isFinite(value) || value < 0 || (type === 'percent' && (value <= 0 || value > 100))) {
    throw ApiError.badRequest('Giá trị voucher không hợp lệ');
  }
  if (!Number.isSafeInteger(minOrder) || minOrder < 0) throw ApiError.badRequest('Đơn hàng tối thiểu phải là số nguyên VND không âm');
  if (type === 'flat' && !Number.isSafeInteger(value)) throw ApiError.badRequest('Giá trị giảm tiền phải là số nguyên VND');
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    throw ApiError.badRequest('Giới hạn lượt dùng phải là số nguyên dương');
  }
  if (startsAt && expiresAt && startsAt >= expiresAt) {
    throw ApiError.badRequest('Ngày kết thúc phải sau ngày bắt đầu');
  }

  return {
    code,
    type,
    value: type === 'freeship' ? 0 : value,
    label,
    minOrder,
    active: input.active ?? true,
    usageLimit,
    ...(startsAt !== undefined ? { startsAt } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  };
};

export const listVouchers = async () => prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });

export const listPublicVouchers = async () => {
  const now = new Date();
  return prisma.voucher.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    select: { code: true, label: true, type: true, value: true, minOrder: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const createVoucher = async (input: VoucherInput) => {
  const data = validateInput(input);
  return prisma.voucher.create({ data });
};

export const updateVoucher = async (id: string, input: Partial<VoucherInput>) => {
  const existing = await prisma.voucher.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Không tìm thấy voucher');
  const data = validateInput({
    code: input.code ?? existing.code,
    type: input.type ?? existing.type as VoucherType,
    value: input.value ?? existing.value,
    label: input.label ?? existing.label,
    minOrder: input.minOrder ?? existing.minOrder,
    active: input.active ?? existing.active,
    usageLimit: input.usageLimit === undefined ? existing.usageLimit : input.usageLimit,
    startsAt: input.startsAt === undefined ? existing.startsAt : input.startsAt,
    expiresAt: input.expiresAt === undefined ? existing.expiresAt : input.expiresAt,
  });
  return prisma.voucher.update({ where: { id }, data });
};

export const deleteVoucher = async (id: string) => {
  const existing = await prisma.voucher.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Không tìm thấy voucher');
  // Orders retain voucherCode for audit; deleting a voucher sets their voucherId to NULL.
  await prisma.voucher.delete({ where: { id } });
  return { message: 'Đã xóa voucher' };
};

export const validateVoucher = async (
  code: string,
  totalAmount: number,
  shippingFee: number = 0,
): Promise<VoucherValidationResult> => {
  if (!code) return { valid: false, error: 'Thiếu mã giảm giá' };
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 0 || !Number.isSafeInteger(shippingFee) || shippingFee < 0) {
    return { valid: false, error: 'Giá trị đơn hàng không hợp lệ' };
  }

  const normalized = normalizeCode(code);
  const voucher = await prisma.voucher.findUnique({ where: { code: normalized } });
  const now = new Date();
  if (!voucher || !voucher.active) return { valid: false, error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' };
  if (voucher.startsAt && voucher.startsAt > now) return { valid: false, error: 'Mã giảm giá chưa đến thời gian sử dụng' };
  if (voucher.expiresAt && voucher.expiresAt < now) return { valid: false, error: 'Mã giảm giá đã hết hạn' };
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    return { valid: false, error: 'Mã giảm giá đã hết lượt sử dụng' };
  }
  if (totalAmount < voucher.minOrder) {
    return { valid: false, error: `Đơn hàng tối thiểu ${voucher.minOrder.toLocaleString('vi-VN')}đ để dùng mã này` };
  }

  const type = voucher.type as VoucherType;
  let discountAmount = 0;
  let freeShip = false;
  if (type === 'percent') discountAmount = Math.min(totalAmount, Math.round((totalAmount * voucher.value) / 100));
  else if (type === 'flat') discountAmount = Math.min(voucher.value, totalAmount);
  else if (type === 'freeship') {
    freeShip = true;
    // Free shipping is represented by shippingFee = 0, not a second discount line.
    discountAmount = 0;
  } else {
    return { valid: false, error: 'Loại voucher không được hỗ trợ' };
  }

  return { valid: true, discountAmount, freeShip, label: voucher.label, code: voucher.code, voucherId: voucher.id };
};

export const MAX_STACKED_VOUCHERS = 5;

export type AppliedVoucherResult = {
  code: string;
  label: string;
  voucherId: string;
  discountAmount: number;
  freeShip: boolean;
};

type StackedValidationResult =
  | { valid: false; error: string }
  | { valid: true; vouchers: AppliedVoucherResult[]; discountAmount: number; freeShip: boolean };

/**
 * Áp dụng NHIỀU mã cùng lúc (tối đa 5).
 *  - Mỗi mã phải tự thoả điều kiện (hạn dùng, lượt dùng, đơn tối thiểu tính trên tiền hàng).
 *  - Giảm % / giảm tiền được tính trên tiền hàng rồi cộng dồn; tổng giảm không vượt quá tiền hàng.
 *  - Mã freeship chỉ cần một mã là miễn phí vận chuyển.
 */
export const validateVouchers = async (
  codes: string[],
  totalAmount: number,
  shippingFee: number = 0,
): Promise<StackedValidationResult> => {
  const unique = [...new Set((codes || []).map((c) => normalizeCode(String(c ?? ''))).filter(Boolean))];
  if (unique.length === 0) return { valid: false, error: 'Thiếu mã giảm giá' };
  if (unique.length > MAX_STACKED_VOUCHERS) {
    return { valid: false, error: `Chỉ áp dụng tối đa ${MAX_STACKED_VOUCHERS} mã giảm giá cho một đơn hàng` };
  }

  const vouchers: AppliedVoucherResult[] = [];
  let remaining = totalAmount;
  let freeShip = false;
  for (const code of unique) {
    const result = await validateVoucher(code, totalAmount, shippingFee);
    if (!result.valid) return { valid: false, error: `${code}: ${result.error}` };
    const discountAmount = Math.min(result.discountAmount, Math.max(0, remaining));
    remaining -= discountAmount;
    if (result.freeShip) freeShip = true;
    vouchers.push({
      code: result.code,
      label: result.label,
      voucherId: result.voucherId,
      discountAmount,
      freeShip: result.freeShip,
    });
  }

  return {
    valid: true,
    vouchers,
    discountAmount: vouchers.reduce((sum, v) => sum + v.discountAmount, 0),
    freeShip,
  };
};

/** Reserve one voucher use inside the same transaction that creates the order. */
export const consumeVoucher = async (tx: Prisma.TransactionClient, voucherId: string): Promise<void> => {
  const now = new Date();
  const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
  if (!voucher || !voucher.active || (voucher.startsAt && voucher.startsAt > now) || (voucher.expiresAt && voucher.expiresAt < now)) {
    throw ApiError.badRequest('Voucher vừa hết hiệu lực, vui lòng kiểm tra lại');
  }
  const where: Prisma.VoucherWhereInput = {
    id: voucherId,
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ...(voucher.usageLimit !== null ? [{ usedCount: { lt: voucher.usageLimit } }] : []),
    ],
  };
  const result = await tx.voucher.updateMany({ where, data: { usedCount: { increment: 1 } } });
  if (result.count !== 1) throw ApiError.badRequest('Voucher đã hết lượt sử dụng');
};

export const releaseVoucherUse = async (tx: Prisma.TransactionClient, voucherId: string | null): Promise<void> => {
  if (!voucherId) return;
  await tx.voucher.updateMany({
    where: { id: voucherId, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  });
};

/**
 * Hoàn lại lượt dùng của TẤT CẢ voucher đã áp vào đơn (khi đơn bị huỷ).
 * `voucherCode` của đơn lưu danh sách mã, ngăn cách bằng dấu phẩy ("TINHOC10,FREESHIP").
 */
export const releaseOrderVouchers = async (
  tx: Prisma.TransactionClient,
  order: { voucherId: string | null; voucherCode: string | null },
): Promise<void> => {
  const codes = (order.voucherCode ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  if (codes.length === 0) {
    await releaseVoucherUse(tx, order.voucherId);
    return;
  }
  await tx.voucher.updateMany({
    where: { code: { in: codes }, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  });
};
