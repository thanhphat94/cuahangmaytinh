import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight,
  Image, X, Loader2
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import { useToast } from '../../components/Toast'
import type { Category } from '../../types'

// ─── Kiểu dữ liệu dùng riêng cho trang admin sản phẩm ──────
/** Response admin: categoryId là ID dạng string, category là quan hệ lồng nhau. */
type AdminCategoryRef = { _id?: string; id?: string; name?: string }

type AdminProductRow = {
  _id: string
  id?: string
  name: string
  slug?: string
  brand?: string | null
  description?: string | null
  images?: string[]
  price: number
  stock: number
  sold?: number | null
  isActive?: boolean
  categoryId?: string | null
  category?: AdminCategoryRef | null
}

type AdminProductsResponse = {
  products: AdminProductRow[]
  totalPages: number
  total: number
}

/** Item trả về từ `POST /upload/multiple`. */
type UploadedImage = { url: string }

/** Body `POST/PUT /admin/products` — giữ đúng tên field backend mong đợi. */
type ProductFormPayload = {
  name: string
  price: number
  categoryId: string
  brand: string
  stock: number
  description: string
  images: string[]
}

/** FormData.get trả `string | File | null`; mọi field đều có trong form nên ép về string giữ nguyên behavior cũ (parseFloat/parseInt trên giá trị rác vẫn ra NaN → 0). */
const formString = (data: FormData, key: string): string => {
  const value = data.get(key)
  return typeof value === 'string' ? value : ''
}

function AdminProducts() {
  const toast = useToast()
  const [products, setProducts] = useState<AdminProductRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [editingProduct, setEditingProduct] = useState<AdminProductRow | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalProducts, setTotalProducts] = useState<number>(0)
  const productsPerPage = 10

  const location = useLocation()

  // Load categories
  useEffect(() => {
    const fetchCategories = async (): Promise<void> => {
      try {
        const res = await api.get('/categories')
        setCategories(res.data as Category[]) // ép kiểu tại biên fetch
      } catch {
        toast.error('Không thể tải danh mục')
      }
    }
    fetchCategories()
  }, [])

  // Handle URL Search Query Parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const searchParam = params.get('search')
    if (searchParam) {
      setSearchQuery(searchParam)
    }
  }, [location.search])

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  // Fetch products
  const fetchProducts = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.get('/admin/products', {
        params: {
          page: currentPage,
          limit: productsPerPage,
          search: searchQuery,
          category: selectedCategory === 'all' ? '' : selectedCategory
        }
      })
      const data = res.data as AdminProductsResponse // ép kiểu tại biên fetch (bảng admin đọc shape riêng)
      setProducts(data.products)
      setTotalPages(data.totalPages)
      setTotalProducts(data.total)
    } catch {
      toast.error('Không thể tải danh sách sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line
  }, [currentPage, searchQuery, selectedCategory])


  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Bạn có chắc muốn ẩn sản phẩm này?')) return
    try {
      await api.delete(`/admin/products/${id}`)
      toast.success('Đã ẩn sản phẩm')
      fetchProducts()
    } catch (err) {
      toast.error('Xóa thất bại: ' + getErrorMessage(err, 'Lỗi không xác định'))
    }
  }

  const handleToggleStatus = async (product: AdminProductRow): Promise<void> => {
    try {
      await api.put(`/admin/products/${product._id}`, { isActive: !product.isActive })
      toast.success(product.isActive ? 'Đã ẩn sản phẩm' : 'Đã hiện sản phẩm')
      fetchProducts()
    } catch {
      toast.error('Cập nhật trạng thái thất bại')
    }
  }

  // ✅ NEW: Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState<boolean>(false)

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []).slice(0, 5)
    setImageFiles(files)
    setImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  const handleRemovePreview = (idx: number): void => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx))
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSaveProduct = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name        = formString(formData, 'name')
    const price       = parseFloat(formString(formData, 'price')) || 0
    const categoryId  = formString(formData, 'categoryId')
    const brand       = formString(formData, 'brand')
    const stock       = parseInt(formString(formData, 'stock')) || 0
    const description = formString(formData, 'description')

    if (!name)    { toast.warning('Vui lòng nhập tên sản phẩm'); return }
    if (price < 0) { toast.warning('Giá sản phẩm không được nhỏ hơn 0'); return }
    if (stock < 0) { toast.warning('Số lượng tồn kho không được nhỏ hơn 0'); return }

    // Upload ảnh trước nếu có file mới
    let uploadedUrls: string[] = editingProduct?.images || []
    if (imageFiles.length > 0) {
      setUploading(true)
      try {
        const fd = new FormData()
        imageFiles.forEach(f => fd.append('images', f))
        const upRes = await api.post('/upload/multiple', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        uploadedUrls = (upRes.data as UploadedImage[]).map(u => u.url) // ép kiểu tại biên fetch
      } catch {
        toast.error('Upload ảnh thất bại, vui lòng thử lại')
        setUploading(false)
        return
      } finally {
        setUploading(false)
      }
    }

    const payload: ProductFormPayload = { name, price, categoryId, brand, stock, description, images: uploadedUrls }

    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct._id}`, payload)
        toast.success('Đã cập nhật sản phẩm')
      } else {
        await api.post('/admin/products', payload)
        toast.success('Đã thêm sản phẩm mới')
      }
      setShowAddModal(false)
      setEditingProduct(null)
      setImageFiles([])
      setImagePreviews([])
      fetchProducts()
    } catch (err) {
      toast.error('Lưu thất bại: ' + getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8] w-64"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setShowAddModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
        >
          <Plus size={18} />
          Thêm sản phẩm
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng tìm thấy', value: totalProducts },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="animate-spin text-[#1a73e8]" size={32} />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Sản phẩm</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Danh mục</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Giá</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Tồn kho</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Đã bán</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      Không tìm thấy sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={product.images?.[0] || 'https://via.placeholder.com/100'} alt={product.name} className="w-10 h-10 object-contain bg-gray-50 rounded-lg" />
                          <div>
                            <p className="font-medium text-sm text-left">{product.name}</p>
                            <p className="text-xs text-gray-500 text-left">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-left">{product.category?.name || '—'}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {new Intl.NumberFormat('vi-VN').format(product.price)}đ
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${product.stock < 10 ? 'text-red-500' : 'text-gray-700'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">{product.sold || 0}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                            product.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {product.isActive ? 'Đang bán' : 'Ngừng bán'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-gray-400 hover:text-[#1a73e8] hover:bg-blue-50 rounded transition"
                            title="Xem sản phẩm"
                          >
                            <Eye size={16} />
                          </a>
                          <button
                            onClick={() => { setEditingProduct(product); setShowAddModal(true) }}
                            className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded transition"
                            title="Sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Trang {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                    currentPage === i + 1
                      ? 'bg-[#1a73e8] text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingProduct) && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => { setShowAddModal(false); setEditingProduct(null) }}
        >
          <form 
            onSubmit={handleSaveProduct}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800">
                {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingProduct(null) }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                  <input 
                    name="name" 
                    type="text" 
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]" 
                    defaultValue={editingProduct?.name || ''} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá (đ) *</label>
                  <input 
                    name="price" 
                    type="number" 
                    required
                    min="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]" 
                    defaultValue={editingProduct?.price || ''} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                  <select 
                    name="categoryId" 
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    defaultValue={editingProduct?.categoryId || editingProduct?.category?._id || editingProduct?.category?.id || ''}
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
                  <input 
                    name="brand" 
                    type="text" 
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]" 
                    defaultValue={editingProduct?.brand || ''} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho *</label>
                <input 
                  name="stock" 
                  type="number" 
                  required
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]" 
                  defaultValue={editingProduct?.stock || '0'} 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea 
                  name="description" 
                  rows={3} 
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  defaultValue={editingProduct?.description || ''}
                />
              </div>

              {/* ✅ NEW: Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh sản phẩm (tối đa 5 ảnh)</label>
                {/* Ảnh hiện tại */}
                {editingProduct?.images && editingProduct.images.length > 0 && imagePreviews.length === 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {editingProduct.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-16 h-16 object-contain rounded-lg border bg-gray-50" />
                    ))}
                    <p className="text-xs text-gray-400 self-end">Chọn ảnh mới để thay thế</p>
                  </div>
                )}
                {/* Preview ảnh mới */}
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt="" className="w-16 h-16 object-contain rounded-lg border bg-gray-50" />
                        <button type="button" onClick={() => handleRemovePreview(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#1a73e8] hover:text-[#1a73e8] transition">
                  <Image size={16} />
                  {imagePreviews.length > 0 ? `Đã chọn ${imagePreviews.length} ảnh` : 'Chọn ảnh'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingProduct(null); setImageFiles([]); setImagePreviews([]) }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button type="submit" disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition disabled:opacity-60">
                {uploading && <Loader2 size={14} className="animate-spin" />}
                {uploading ? 'Đang upload...' : editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminProducts
