
import api from '../api/api'

/**
 * Dữ liệu thông báo hiển thị ở AdminLayout.
 */
export type AdminNotification = {
  id: string
  type?: 'order' | 'review' | 'contact' | 'stock' | 'user'
  text: string
  time: string
  read: boolean
  link: string
}

export const adminService = {
  getNotifications: () =>
    api.get<AdminNotification[]>('/admin/notifications'),
}
