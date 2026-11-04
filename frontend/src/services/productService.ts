import api from '../api/api'
import type { Product, ProductFilters, ProductListResult } from '../types'

export const productService = {
  getAll: (params?: ProductFilters) => api.get<ProductListResult>('/products', { params }),
  getBySlug: (slug: string) => api.get<Product>(`/products/${slug}`),
  getFeatured: () => api.get<Product[]>('/products/featured'),
  getNewProducts: () => api.get<Product[]>('/products/new'),
  getDiscounted: (limit = 20) => api.get<Product[]>('/products/discounted', { params: { limit } }),
}
