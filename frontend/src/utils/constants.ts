// Slug PHẢI khớp với slug trong MongoDB (từ seedProducts.js)

/** Tên component lucide-react dùng trong `iconMap` của Header/CategoryCard. */
export type CategoryIcon = 'Monitor' | 'Camera' | 'Printer'

/** Slug danh mục gốc trong DB — khớp khoá của bảng SUBCATEGORIES trong Header. */
export type CategorySlug = 'may-tinh-pc' | 'camera-quan-sat' | 'may-in'

export interface CategoryItem {
  id: number
  name: string
  icon: CategoryIcon
  slug: CategorySlug
}

export const CATEGORIES: CategoryItem[] = [
  { id: 1, name: 'Máy tính & PC', icon: 'Monitor',   slug: 'may-tinh-pc'      },
  { id: 2, name: 'Camera quan sát', icon: 'Camera',   slug: 'camera-quan-sat'  },
  { id: 3, name: 'Máy in',          icon: 'Printer',  slug: 'may-in'           },
]

export const BRANDS: string[] = [
  'Hikvision', 'Dahua', 'Uniarch', 'Ruijie', 'Ugreen', 'Pantum', 'VSP', 'eMaster'
]

export interface ContactInfo {
  phone: string
  email: string
  address: string
  workingHours: string
}

export const CONTACT_INFO: ContactInfo = {
  phone: '0934 444 369',
  email: 'info@cuahangmaytinh.vn',
  address: '123 Đường ABC, Quận XYZ, TP.HCM',
  workingHours: '8:00 - 18:00 (Thứ 2 - Thứ 7)',
}
