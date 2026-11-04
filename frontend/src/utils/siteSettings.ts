import type { SiteSettings } from '../types'

export const SITE_SETTINGS_KEY = 'site_settings'

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: 'Cửa Hàng Máy Tính',
  tagline: 'Thiết bị tin học chính hãng',
  email: 'info@cuahangmaytinh.vn',
  phone: '0934 444 369',
  hotline: '0934 444 369',
  address: '123 Đường ABC, Quận XYZ, TP.HCM',
  description: 'Cửa hàng máy tính chuyên cung cấp thiết bị tin học, camera, máy in, linh kiện máy tính chính hãng với giá tốt nhất.',
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
}

/**
 * Đọc cấu hình cửa hàng từ localStorage và merge đè lên bản mặc định
 * (giống hệt code gốc: không kiểm tra từng field, JSON nào hợp lệ cũng được nhận).
 */
export function loadSiteSettings(): SiteSettings {
  try {
    const stored = window.localStorage.getItem(SITE_SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_SITE_SETTINGS, ...(JSON.parse(stored) as Partial<SiteSettings>) }
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_SITE_SETTINGS }
}

export function saveSiteSettings(settings: Partial<SiteSettings>): void {
  window.localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(settings))
}

/** Viết tắt tên cửa hàng cho avatar: tối đa 2 từ đứng đầu, mặc định 'TN'. */
export function getStoreInitials(storeName: string): string {
  return storeName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'TN'
}
