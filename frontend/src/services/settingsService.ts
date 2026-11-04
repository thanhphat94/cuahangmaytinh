import api from '../api/api'
import { DEFAULT_SITE_SETTINGS } from '../utils/siteSettings'
import type { SiteSettings } from '../types'

/** Danh sách field được phép nhận/gửi qua API — khớp `SiteSettings` trong `types/index.ts`. */
const PUBLIC_FIELDS: readonly (keyof SiteSettings)[] = [
  'storeName', 'tagline', 'email', 'phone', 'hotline',
  'address', 'description', 'workingHours', 'defaultShippingFee', 'freeShippingFrom',
  'enableCod', 'enableBankTransfer', 'bankName', 'bankAccount', 'bankAccountName', 'enableMomo', 'enableVnpay',
]

/** Chỉ giữ lại các field whitelist; bỏ qua đúng khi giá trị `undefined` (giữ nguyên semantics gốc). */
function pickPublicFields(data: Partial<SiteSettings>): Partial<SiteSettings> {
  const result: Partial<SiteSettings> = {}
  for (const field of PUBLIC_FIELDS) {
    const value = data[field]
    if (value !== undefined) {
      // `field` là union các khoá nên TS không cho gán `result[field] = value`
      // trực tiếp; Object.assign giữ đúng cùng hành vi ghi từng field.
      Object.assign(result, { [field]: value })
    }
  }
  return result
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data } = await api.get<SiteSettings>('/settings')
  return { ...DEFAULT_SITE_SETTINGS, ...pickPublicFields(data) }
}

export async function saveSiteSettingsToApi(updates: Partial<SiteSettings>): Promise<SiteSettings> {
  const { data } = await api.put<SiteSettings>('/settings', pickPublicFields(updates))
  return { ...DEFAULT_SITE_SETTINGS, ...pickPublicFields(data) }
}
