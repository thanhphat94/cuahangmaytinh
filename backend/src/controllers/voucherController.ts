import catchAsync from '../helpers/catchAsync';
import { getSettings } from '../services/settingsService';
import * as voucherService from '../services/voucherService';

export const applyVoucher = catchAsync(async (req, res) => {
  const { code, codes, totalAmount } = req.body as { code?: unknown; codes?: unknown; totalAmount?: unknown };
  // Nhận danh sách `codes` (nhiều mã) hoặc `code` (một mã, tương thích bản cũ)
  const list: string[] = Array.isArray(codes)
    ? codes.filter((c): c is string => typeof c === 'string')
    : typeof code === 'string' ? [code] : [];
  const subtotal = Number(totalAmount);
  const settings = await getSettings();
  const shippingFee = subtotal >= settings.freeShippingFrom ? 0 : settings.defaultShippingFee;
  const result = await voucherService.validateVouchers(list, subtotal, shippingFee);
  if (!result.valid) return res.status(400).json({ message: result.error });
  res.json({
    valid: true,
    vouchers: result.vouchers.map(({ code: c, label, discountAmount, freeShip }) => ({ code: c, label, discountAmount, freeShip })),
    discountAmount: result.discountAmount,
    freeShip: result.freeShip,
  });
});

export const getPublicVouchers = catchAsync(async (_req, res) => {
  res.json(await voucherService.listPublicVouchers());
});

export const getAdminVouchers = catchAsync(async (_req, res) => {
  res.json(await voucherService.listVouchers());
});

export const createVoucher = catchAsync(async (req, res) => {
  const voucher = await voucherService.createVoucher(req.body);
  res.status(201).json(voucher);
});

export const updateVoucher = catchAsync(async (req, res) => {
  res.json(await voucherService.updateVoucher(req.params.id, req.body));
});

export const deleteVoucher = catchAsync(async (req, res) => {
  res.json(await voucherService.deleteVoucher(req.params.id));
});
