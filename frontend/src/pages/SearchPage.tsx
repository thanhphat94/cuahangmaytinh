import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, ArrowLeft, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import api from '../api/api'
import type { Product, ProductFilters, ProductListResult } from '../types'

/**
 * MISMATCH: `ProductCard` (đã convert) khai báo `discount?: number` trong khi
 * `types/index.ts` để `Product.discount?: number | string | null`. Giá trị truyền xuống
 * `ProductCard` giữ nguyên 100% như bản JS nên chỉ assertion ở biên render.
 */
type CardProduct = Product & { discount?: number }

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc',label: 'Giá giảm dần' },
  { value: 'popular',   label: 'Phổ biến nhất' },
]

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]         = useState(1)
  const [sort, setSort]         = useState<string>('newest')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string>('')

  const PER_PAGE = 20

  const fetchResults = useCallback(async (q: string, p: number, s: string): Promise<void> => {
    if (!q.trim()) { setProducts([]); setTotal(0); return }
    setLoading(true)
    setError('')
    try {
      const params: ProductFilters = { search: q, page: p, limit: PER_PAGE, sort: s }
      const res = await api.get<ProductListResult>('/products', { params })
      const data = res.data
      setProducts(data.products || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      setError('Không thể tải kết quả tìm kiếm. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query, sort])

  useEffect(() => {
    fetchResults(query, page, sort)
    window.scrollTo({ top: 0, behavior: 'auto' }) // tức thì: cuộn mượt làm trang ngắn bị giật
    document.title = query ? `Tìm kiếm: "${query}" — Cửa Hàng Máy Tính` : 'Tìm kiếm — Cửa Hàng Máy Tính'
  }, [query, page, sort, fetchResults])

  const handleSortChange = (val: string): void => setSort(val)
  const handleClearSearch = () => setSearchParams({})

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Link to="/" className="flex items-center gap-1 hover:text-[#1a73e8] transition">
          <ArrowLeft size={16} /> Trang chủ
        </Link>
        <span>/</span>
        <span className="text-gray-800">Tìm kiếm</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Search size={24} className="text-[#1a73e8] shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {query ? <>Kết quả cho: <span className="text-[#1a73e8]">"{query}"</span></> : 'Tìm kiếm sản phẩm'}
              </h1>
              {!loading && query && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {total > 0 ? `Tìm thấy ${total} sản phẩm` : 'Không tìm thấy sản phẩm nào'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {query && (
              <button onClick={handleClearSearch}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition border border-gray-200 px-3 py-1.5 rounded-lg">
                <X size={14} /> Xoá tìm kiếm
              </button>
            )}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-gray-400" />
              <select value={sort} onChange={e => handleSortChange(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 bg-white">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results — min-height giữ chiều cao trang ổn định khi trang cuối chỉ có 1 hàng */}
      <div className="min-h-[70vh]">
      {loading && products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 size={40} className="animate-spin text-[#1a73e8]" />
          <p>Đang tìm kiếm...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500 mb-3">{error}</p>
          <button onClick={() => fetchResults(query, page, sort)}
            className="px-5 py-2 bg-[#1a73e8] text-white rounded-lg text-sm hover:bg-[#1557b0] transition">
            Thử lại
          </button>
        </div>
      ) : !query ? (
        <div className="text-center py-20 text-gray-400">
          <Search size={60} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Nhập từ khoá vào ô tìm kiếm bên trên để bắt đầu</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Search size={60} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Không tìm thấy sản phẩm nào</p>
          <p className="text-gray-400 text-sm mb-6">Thử từ khoá khác hoặc kiểm tra chính tả</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8] text-white rounded-lg text-sm font-medium hover:bg-[#1557b0] transition">
            Xem tất cả sản phẩm
          </Link>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {products.map(p => <ProductCard key={p._id || p.id} product={p as CardProduct} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:border-[#1a73e8] hover:text-[#1a73e8] transition">
                ← Trước
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition ${page === p ? 'bg-[#1a73e8] text-white' : 'border hover:border-[#1a73e8] hover:text-[#1a73e8]'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:border-[#1a73e8] hover:text-[#1a73e8] transition">
                Sau →
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}

export default SearchPage
