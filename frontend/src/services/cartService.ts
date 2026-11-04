import api from '../api/api'
import type { CartLine } from '../types'

/**
 * Mọi endpoint `/cart` (backend `controllers/cartController.ts`) trả về toàn bộ
 * giỏ hàng sau khi thao tác — riêng `clearCart` backend trả `[]`, nên kiểu vẫn là mảng.
 */
export const cartService = {
  getCart: () => api.get<CartLine[]>('/cart'),
  addToCart: (productId: string, quantity: number) =>
    api.post<CartLine[]>('/cart', { productId, quantity }),
  updateQuantity: (productId: string, quantity: number) =>
    api.put<CartLine[]>(`/cart/${productId}`, { quantity }),
  removeFromCart: (productId: string) => api.delete<CartLine[]>(`/cart/${productId}`),
  clearCart: () => api.delete<CartLine[]>('/cart'),
}
