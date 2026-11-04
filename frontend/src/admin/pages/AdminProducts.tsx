import { useState, useEffect, useCallback, useRef } from 'react'
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

/** Giá trị các ô trong form (luôn là string vì lấy từ <input>). */
type ProductFormValues = {
  name: string
  price: string
  categoryId: string
  brand: string
  stock: string
  description: string
}

const categoryKey = (c: Category): string => c._id ?? c.id

// ─── Form thêm/sửa sản phẩm ────────────────────────────────
const EMPTY_FORM: ProductFormValues = { name: '', price: '', categoryId: '', brand: '', stock: '0', description: '' }
const FORM_KEYS = Object.keys(EMPTY_FORM) as (keyof ProductFormValues)[]

/** Bản nháp của form "Thêm sản phẩm" — còn lại nếu trang bị tải lại/đóng nhầm khi đang nhập dở. */
const DRAFT_KEY = 'cuahangmaytinh_admin_product_draft_v1'

const formFromProduct = (product: AdminProductRow): ProductFormValues => ({
  name: product.name ?? '',
  price: product.price ? String(product.price) : '',
  categoryId: product.categoryId || product.category?._id || product.category?.id || '',
  brand: product.brand ?? '',
  stock: String(product.stock ?? 0),
  description: product.description ?? '',
})

const hasDraftContent = (form: ProductFormValues): boolean =>
  Boolean(form.name || form.price || form.brand || form.description)

const readDraft = (): ProductFormValues | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const value = parsed as Partial<Record<keyof ProductFormValues, unknown>>
    const draft = { ...EMPTY_FORM }
    for (const key of FORM_KEYS) {
      const field = value[key]
      if (typeof field === 'string') draft[key] = field
    }
    return hasDraftContent(draft) ? draft : null
  } catch {
    return null
  }
}

const writeDraft = (form: ProductFormValues | null): void => {
  try {
    if (form && hasDraftContent(form)) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    else sessionStorage.removeItem(DRAFT_KEY)
  } catch { /* sessionStorage có thể bị chặn; form vẫn hoạt động bình thường */ }
}

type ProductFormModalProps = {
  product: AdminProductRow | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

/**
 * Component riêng ở cấp module (không khai báo trong AdminProducts) và giữ giá trị
 * các ô bằng state của chính nó, nên không bị mất chữ đã nhập khi danh sách phía sau
 * tải lại / render lại.
 */
function ProductFormModal({ product, categories, onClose, onSaved }: ProductFormModalProps) {
  const toast = useToast()
  const isEditing = product !== null

  const [initialValues] = useState<ProductFormValues>(() => (product ? formFromProduct(product) : EMPTY_FORM))
  const [restoredDraft] = useState<ProductFormValues | null>(() => (product ? null : readDraft()))
  const [form, setForm] = useState<ProductFormValues>(() => restoredDraft ?? initialValues)
  const [showDraftNotice, setShowDraftNotice] = useState<boolean>(restoredDraft !== null)

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [stage, setStage] = useState<'idle' | 'uploading' | 'saving'>('idle')

  const busy = stage !== 'idle'
  const isDirty = imageFiles.length > 0 || FORM_KEYS.some((key) => form[key] !== initialValues[key])

  // Lưu nháp liên tục (chỉ khi thêm mới) để lỡ bị đóng/tải lại vẫn lấy lại được.
  useEffect(() => {
    if (!isEditing) writeDraft(form)
  }, [form, isEditing])

  // Giải phóng URL xem trước ảnh khi đóng modal.
  const previewsRef = useRef<string[]>([])
  previewsRef.current = imagePreviews
  useEffect(() => () => { previewsRef.current.forEach((url) => URL.revokeObjectURL(url)) }, [])

  const setField = (key: keyof ProductFormValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
      const value = e.target.value
      setForm((previous) => ({ ...previous, [key]: value }))
    }

  const requestClose = (): void => {
    if (busy) return
    if (isDirty && !window.confirm('Bạn có thay đổi chưa lưu. Đóng và bỏ các thay đổi này?')) return
    if (!isEditing) writeDraft(null)
    onClose()
  }

  // Esc để đóng (cũng hỏi xác nhận nếu đang nhập dở).
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') requestCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Chỉ đóng khi người dùng nhấn VÀ nhả chuột trên nền mờ. Nếu bấm chuột trong ô nhập rồi
  // kéo bôi đen chữ và nhả ra ngoài form thì trình duyệt vẫn bắn click vào nền mờ — trước đây
  // chính điều này làm modal đóng và mất hết dữ liệu đang nhập.
  const pressStartedOnBackdrop = useRef(false)

  const discardDraft = (): void => {
    setForm(initialValues)
    writeDraft(null)
    setShowDraftNotice(false)
  }

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(e.target.files ?? []).slice(0, 5)
    e.target.value = '' // cho phép chọn lại đúng file đó lần nữa
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImageFiles(files)
    setImagePreviews(files.map((file) => URL.createObjectURL(file)))
  }

  const handleRemovePreview = (index: number): void => {
    const removed = imagePreviews[index]
    if (removed) URL.revokeObjectURL(removed)
    setImageFiles((previous) => previous.filter((_, i) => i !== index))
    setImagePreviews((previous) => previous.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (busy) return

    const name = form.name.trim()
    const price = parseFloat(form.price) || 0
    const stock = parseInt(form.stock, 10) || 0

    if (!name)     { toast.warning('Vui lòng nhập tên sản phẩm'); return }
    if (price < 0) { toast.warning('Giá sản phẩm không được nhỏ hơn 0'); return }
    if (stock < 0) { toast.warning('Số lượng tồn kho không được nhỏ hơn 0'); return }

    try {
      // Upload ảnh trước nếu có file mới
      let images: string[] = product?.images ?? []
      if (imageFiles.length > 0) {
        setStage('uploading')
        try {
          const fd = new FormData()
          imageFiles.forEach((file) => fd.append('images', file))
          const upRes = await api.post('/upload/multiple', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          images = (upRes.data as UploadedImage[]).map((item) => item.url) // ép kiểu tại biên fetch
        } catch {
          toast.error('Upload ảnh thất bại, vui lòng thử lại')
          return
        }
      }

      setStage('saving')
      const payload: ProductFormPayload = {
        name,
        price,
        categoryId: form.categoryId,
        brand: form.brand.trim(),
        stock,
        description: form.description,
        images,
      }
      if (product) {
        await api.put(`/admin/products/${product._id}`, payload)
        toast.success('Đã cập nhật sản phẩm')
      } else {
        await api.post('/admin/products', payload)
        toast.success('Đã thêm sản phẩm mới')
        writeDraft(null)
      }
      onSaved()
    } catch (err) {
      toast.error('Lưu thất bại: ' + getErrorMessage(err))
    } finally {
      setStage('idle')
    }
  }

  const inputClass = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-title"
      onMouseDown={(e) => { pressStartedOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressStartedOnBackdrop.current) requestClose()
        pressStartedOnBackdrop.current = false
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 id="product-form-title" className="font-bold text-lg text-gray-800">
            {isEditing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          </h3>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-left">
          {showDraftNotice && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <span>Đã khôi phục bản nháp bạn đang nhập dở.</span>
              <button type="button" onClick={discardDraft} className="font-medium underline shrink-0">
                Xóa nháp
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
              <input
                name="name"
                type="text"
                required
                autoComplete="off"
                className={inputClass}
                value={form.name}
                onChange={setField('name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá (đ) *</label>
              <input
                name="price"
                type="number"
                required
                min="0"
                className={inputClass}
                value={form.price}
                onChange={setField('price')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
              <select
                name="categoryId"
                className={inputClass}
                value={form.categoryId}
                onChange={setField('categoryId')}
                required
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={categoryKey(c)} value={categoryKey(c)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
              <input
                name="brand"
                type="text"
                autoComplete="off"
                className={inputClass}
                value={form.brand}
                onChange={setField('brand')}
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
              className={inputClass}
              value={form.stock}
              onChange={setField('stock')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              name="description"
              rows={3}
              className={inputClass}
              value={form.description}
              onChange={setField('description')}
            />
          </div>

          {/* Upload ảnh */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh sản phẩm (tối đa 5 ảnh)</label>
            {/* Ảnh hiện tại */}
            {product?.images && product.images.length > 0 && imagePreviews.length === 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {product.images.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-16 h-16 object-contain rounded-lg border bg-gray-50" />
                ))}
                <p className="text-xs text-gray-400 self-end">Chọn ảnh mới để thay thế</p>
              </div>
            )}
            {/* Preview ảnh mới */}
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {imagePreviews.map((src, i) => (
                  <div key={src} className="relative group">
                    <img src={src} alt="" className="w-16 h-16 object-contain rounded-lg border bg-gray-50" />
                    <button
                      type="button"
                      onClick={() => handleRemovePreview(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
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
            onClick={requestClose}
            disabled={busy}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {stage === 'uploading' ? 'Đang upload...' : stage === 'saving' ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Trang danh sách sản phẩm ──────────────────────────────
const readSearchParam = (search: string): string =>
  (new URLSearchParams(search).get('search') ?? '').trim()

const SEARCH_DEBOUNCE_MS = 300

type ModalState = { open: false } | { open: true; product: AdminProductRow | null }

function AdminProducts() {
  const toast = useToast()
  const location = useLocation()

  const [products, setProducts] = useState<AdminProductRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  // `searchInput` = chữ đang gõ trong ô; `searchQuery` = giá trị thật sự dùng để gọi API (đã debounce).
  const [searchInput, setSearchInput] = useState<string>(() => readSearchParam(location.search))
  const [searchQuery, setSearchQuery] = useState<string>(() => readSearchParam(location.search))
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [loading, setLoading] = useState<boolean>(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalProducts, setTotalProducts] = useState<number>(0)
  const productsPerPage = 10

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đồng bộ với ô "Tìm kiếm..." trên thanh header: mỗi lần điều hướng tới /admin/products?search=...
  // (hoặc bỏ ?search=) thì cập nhật cả ô nhập lẫn kết quả ngay, không chờ debounce.
  useEffect(() => {
    const term = readSearchParam(location.search)
    setSearchInput(term)
    setSearchQuery(term)
    setCurrentPage(1)
  }, [location.key, location.search])

  // Debounce: chờ người dùng ngừng gõ rồi mới tìm, và luôn về trang 1 trong cùng một lần render
  // (trước đây đổi trang ở effect riêng nên bắn 2 request, request cũ có thể về sau và ghi đè).
  useEffect(() => {
    const next = searchInput.trim()
    if (next === searchQuery) return
    const timer = window.setTimeout(() => {
      setSearchQuery(next)
      setCurrentPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const applySearchNow = (): void => {
    setSearchQuery(searchInput.trim())
    setCurrentPage(1)
  }

  const clearSearch = (): void => {
    setSearchInput('')
    setSearchQuery('')
    setCurrentPage(1)
  }

  // Fetch products — chỉ nhận kết quả của request MỚI NHẤT; request cũ về muộn sẽ bị bỏ qua.
  const requestIdRef = useRef(0)
  const fetchProducts = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current
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
      if (requestId !== requestIdRef.current) return
      const data = res.data as AdminProductsResponse // ép kiểu tại biên fetch (bảng admin đọc shape riêng)
      setProducts(data.products)
      setTotalPages(data.totalPages)
      setTotalProducts(data.total)
      // Vừa xóa/ẩn hết sản phẩm ở trang cuối → lùi về trang cuối còn dữ liệu.
      if (data.totalPages > 0 && currentPage > data.totalPages) setCurrentPage(data.totalPages)
    } catch {
      if (requestId !== requestIdRef.current) return
      toast.error('Không thể tải danh sách sản phẩm')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, selectedCategory])

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  // Rời trang: bỏ qua mọi response còn đang bay.
  useEffect(() => () => { requestIdRef.current += 1 }, [])

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Bạn có chắc muốn ẩn sản phẩm này?')) return
    try {
      await api.delete(`/admin/products/${id}`)
      toast.success('Đã ẩn sản phẩm')
      void fetchProducts()
    } catch (err) {
      toast.error('Xóa thất bại: ' + getErrorMessage(err, 'Lỗi không xác định'))
    }
  }

  const handleToggleStatus = async (product: AdminProductRow): Promise<void> => {
    try {
      await api.put(`/admin/products/${product._id}`, { isActive: !product.isActive })
      toast.success(product.isActive ? 'Đã ẩn sản phẩm' : 'Đã hiện sản phẩm')
      void fetchProducts()
    } catch {
      toast.error('Cập nhật trạng thái thất bại')
    }
  }

  const selectedCategoryName = categories.find((c) => categoryKey(c) === selectedCategory)?.name
  const showInitialSpinner = loading && products.length === 0

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, hãng, mã SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearchNow() }}
              className="pl-10 pr-9 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8] w-72"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1) }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={categoryKey(c)} value={categoryKey(c)}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setModal({ open: true, product: null })}
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
          {showInitialSpinner ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="animate-spin text-[#1a73e8]" size={32} />
            </div>
          ) : (
            <table
              className={`w-full transition-opacity ${loading ? 'opacity-50' : ''}`}
              aria-busy={loading}
            >
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
                      {searchQuery ? ` khớp "${searchQuery}"` : ''}
                      {selectedCategory !== 'all' && selectedCategoryName ? ` trong danh mục "${selectedCategoryName}"` : ''}
                      {selectedCategory !== 'all' && searchQuery && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => { setSelectedCategory('all'); setCurrentPage(1) }}
                            className="text-sm text-[#1a73e8] hover:underline"
                          >
                            Tìm trong tất cả danh mục
                          </button>
                        </div>
                      )}
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
                            onClick={() => setModal({ open: true, product })}
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
      {modal.open && (
        <ProductFormModal
          key={modal.product?._id ?? 'new'}
          product={modal.product}
          categories={categories}
          onClose={() => setModal({ open: false })}
          onSaved={() => { setModal({ open: false }); void fetchProducts() }}
        />
      )}
    </div>
  )
}

export default AdminProducts