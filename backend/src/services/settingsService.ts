import type { SiteSettings } from '@prisma/client';
import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

const STRING_FIELDS = [
  'storeName', 'tagline', 'email', 'phone', 'hotline',
  'address', 'description', 'workingHours', 'bankName', 'bankAccount', 'bankAccountName',
] as const;
const NUMBER_FIELDS = ['defaultShippingFee', 'freeShippingFrom'] as const;
const BOOLEAN_FIELDS = ['enableCod', 'enableBankTransfer', 'enableMomo', 'enableVnpay'] as const;

type SettingsInput = Partial<Pick<SiteSettings,
  | typeof STRING_FIELDS[number]
  | typeof NUMBER_FIELDS[number]
  | typeof BOOLEAN_FIELDS[number]
>>;

const DEFAULT_SETTINGS: SettingsInput = {
  storeName: 'Cửa Hàng Máy Tính',
  tagline: 'Thiết bị tin học chính hãng',
  email: 'info@cuahangmaytinh.vn',
  phone: '0934 444 369',
  hotline: '0934 444 369',
  address: '123 Đường ABC, Quận XYZ, TP.HCM',
  description: 'Cửa hàng máy tính chuyên cung cấp thiết bị tin học chính hãng',
  workingHours: '8:00 - 18:00 (Thứ 2 - Thứ 7)',
  defaultShippingFee: 30000,
  freeShippingFrom: 500000,
  enableCod: true,
  enableBankTransfer: false,
  bankName: '',
  bankAccount: '',
  bankAccountName: '',
  enableMomo: false,
  enableVnpay: false,
};

export const getSettings = async () => {
  let settings = await prisma.siteSettings.findFirst();
  if (!settings) settings = await prisma.siteSettings.create({ data: DEFAULT_SETTINGS });
  return { ...settings, _id: settings.id };
};

export const updateSettings = async (data: SettingsInput) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw ApiError.badRequest('Dữ liệu cài đặt không hợp lệ');
  }

  const updates: Record<string, unknown> = {};
  for (const field of STRING_FIELDS) {
    if (data[field] !== undefined) {
      const value = data[field];
      if (typeof value !== 'string' || value.length > 5000) {
        throw ApiError.badRequest(`Giá trị ${field} không hợp lệ`);
      }
      updates[field] = value.trim();
    }
  }
  for (const field of NUMBER_FIELDS) {
    if (data[field] !== undefined) {
      const value = Number(data[field]);
      if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000_000) {
        throw ApiError.badRequest(`Giá trị ${field} phải là số không âm hợp lệ`);
      }
      updates[field] = value;
    }
  }
  if (data.bankAccount !== undefined && data.bankAccount !== '' && !/^[0-9 -]{6,30}$/.test(String(data.bankAccount))) {
    throw ApiError.badRequest('Số tài khoản ngân hàng không hợp lệ');
  }
  for (const field of BOOLEAN_FIELDS) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'boolean') throw ApiError.badRequest(`Giá trị ${field} không hợp lệ`);
      updates[field] = data[field];
    }
  }
  if (Object.keys(updates).length === 0) throw ApiError.badRequest('Không có thông tin nào được cập nhật');

  const existing = await prisma.siteSettings.findFirst();
  const settings = existing
    ? await prisma.siteSettings.update({ where: { id: existing.id }, data: updates })
    : await prisma.siteSettings.create({ data: { ...DEFAULT_SETTINGS, ...updates } });
  return { ...settings, _id: settings.id };
};
