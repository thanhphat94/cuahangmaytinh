import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSEO } from '../hooks/useSEO'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { ChevronRight, Tag, LayoutGrid } from 'lucide-react'
import { productService } from '../services/productService'
import api from '../api/api'
import type { Category, Product } from '../types'

/** Bộ lọc `?type=` khớp theo tên sản phẩm — khoá là slug loại, giá trị là hàm test tên. */
type TypeMatcher = Record<string, (name: string) => boolean>

/**
 * `ProductCard` đọc badge `discount` kiểu `number`, còn `types/index.Product.discount`
 * để `number | string | null` (di sản MongoDB) — thu hẹp ở call site render card.
 */
type CardProduct = Product & { discount?: number }

function CategoryPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const typeFilter  = searchParams.get('type')   || null
  const brandFilter = searchParams.get('brand')  || null
  const priceFilter = searchParams.get('price')  || ''   // dạng "min-max", vd 10000000-15000000

  const [category, setCategory]           = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [products, setProducts]           = useState<Product[]>([])
  const [brandOptions, setBrandOptions]   = useState<string[]>([])
  const [catLoading, setCatLoading]       = useState(true)
  const [prodLoading, setProdLoading]     = useState(true)

  // ✅ SEO động theo category
  useSEO({
    title:       category?.name,
    description: `Mua ${category?.name || 'sản phẩm'} chính hãng, giá tốt tại Cửa Hàng Máy Tính. Bảo hành uy tín, giao hàng nhanh toàn quốc.`,
    url:         `/category/${slug}`,
  })

  // ── 1. Load danh mục ──────────────────────────────────────────
  useEffect(() => {
    // Không có `:slug` thì coi như không tìm thấy danh mục (đúng UI mà request lỗi vẫn render)
    if (!slug) {
      setCategory(null)
      setAllCategories([])
      setCatLoading(false)
      return
    }
    let cancelled = false
    const run = async () => {
      setCatLoading(true)
      setProducts([])
      try {
        const [catRes, allRes] = await Promise.all([
          api.get<Category>(`/categories/${slug}`),
          api.get<Category[]>('/categories'),
        ])
        if (cancelled) return
        setCategory(catRes.data)
        setAllCategories(Array.isArray(allRes.data) ? allRes.data : [])
      } catch {
        if (!cancelled) { setCategory(null); setAllCategories([]) }
      } finally {
        if (!cancelled) setCatLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [slug])

  // ── 2. Load & lọc sản phẩm ────────────────────────────────────
  const loadProducts = useCallback(async (categoryId: string) => {
    if (!categoryId) return
    setProdLoading(true)
    try {
      const res = await productService.getAll({ category: categoryId, limit: 200 })
      let prods = res.data?.products || []
      const brands = prods.map(p => p.brand).filter((b): b is string => Boolean(b))
      setBrandOptions([...new Set(brands)].sort())

      // Lọc theo ?type= dựa vào tên sản phẩm (case-insensitive)
      if (typeFilter) {
        const typeMap: TypeMatcher = {
          // Camera
          'ip':       (n) => /camera\s+ip/i.test(n),
          'ptz':      (n) => /ptz/i.test(n),
          'wifi':     (n) => /camera\s+wifi/i.test(n),
          'outdoor':  (n) => /ngo[àa]i\s+tr[oờ]i/i.test(n),
          'bullet':   (n) => /th[âa]n|bullet/i.test(n),
          'dome':     (n) => /dome/i.test(n),
          'kit':      (n) => /tr[oọ]n\s+b[oộ]|kit/i.test(n),
          'nvr':      (n) => /nvr|dvr|[đd][âầ]u\s+ghi/i.test(n),
          // Máy tính
          'desktop':  (n) => /[đd][eể]\s+b[àa]n|optiplex|prodesk|elitedesk|expertcenter|office|all[-\s]in[-\s]one|aio/i.test(n),
          'laptop':   (n) => /laptop/i.test(n),
          'monitor':  (n) => /m[àa]n\s+h[ìi]nh/i.test(n),
          'mini-pc':  (n) => /mini\s+pc|mini[-\s]pc|firebat|ws\s+tech|pv\s+home/i.test(n),
          'gaming':   (n) => /gaming/i.test(n),
          'workstation': (n) => /workstation|dgx|z4\s+g4|z2\s+g9|hpe/i.test(n),
          // Linh kiện
          'cpu':      (n) => /cpu|vi\s+x[uử]/i.test(n),
          'ram':      (n) => /\bram\b/i.test(n),
          'ssd':      (n) => /ssd|[oổ]\s+c[uứ]ng/i.test(n),
          'gpu':      (n) => /gpu|card\s+m[àa]n/i.test(n),
          'mainboard':(n) => /mainboard|main\b/i.test(n),
          'psu':      (n) => /ngu[oồ]n|psu/i.test(n),
          'case':     (n) => /case|t[aả]n\s+nhi[eệ]t/i.test(n),
          // Máy in
          'laser-bw':     (n) => /laser\s+[đd][eê]n\s+tr[aắ]ng|laser.*trang\s+[đd]en|[đd]en\s+tr[aắ]ng.*laser/i.test(n),
          'laser-color':  (n) => /laser\s+m[àa]u|m[àa]u.*laser/i.test(n),
          'inkjet':       (n) => /ph[uú]n/i.test(n),
          'multifunction':(n) => /[đd]a\s+(n[aă]ng|ch[uứ]c\s+n[aă]ng)|mfc|copy.*scan|scan.*copy/i.test(n),
          'toner':        (n) => /m[uự]c\s+in|h[oộ]p\s+m[uự]c|toner/i.test(n),
          'label':        (n) => /nh[aã]n/i.test(n),
          // Mạng
          'router':   (n) => /router/i.test(n),
          'switch':   (n) => /switch/i.test(n),
          'ap':       (n) => /access\s+point|wifi.*ap\b/i.test(n),
          'modem':    (n) => /modem/i.test(n),
          'cable':    (n) => /c[aá]p\s+m[aạ]ng|[đd][aầ]u\s+b[aấ]m/i.test(n),
          'nas':      (n) => /nas|server/i.test(n),
        }
        const matchFn = typeMap[typeFilter]
        if (matchFn) prods = prods.filter(p => matchFn(p.name))
      }

      // Lọc theo ?brand= dựa vào field brand hoặc tên sản phẩm
      if (brandFilter) {
        prods = prods.filter(p =>
          (p.brand && p.brand.toLowerCase() === brandFilter.toLowerCase()) ||
          p.name.toLowerCase().includes(brandFilter.toLowerCase())
        )
      }

      setProducts(prods)
    } catch {
      setProducts([])
    } finally {
      setProdLoading(false)
    }
  }, [typeFilter, brandFilter])

  useEffect(() => {
    if (catLoading || !category?._id) return
    loadProducts(category._id)
  }, [catLoading, category, loadProducts])

  // ── Sidebar: chỉ lấy root categories ──────────────────────────
  const rootCategories = allCategories.filter(c => !c.parentId)

  // ── Label hiển thị filter đang áp dụng ───────────────────────
  // Lọc theo khoảng giá (phía client, trên danh sách đã tải)
  const visibleProducts = useMemo(() => {
    if (!priceFilter) return products
    const [min, max] = priceFilter.split('-').map(Number)
    return products.filter(p => p.price > 0 && p.price >= (min || 0) && (!max || p.price <= max))
  }, [products, priceFilter])

  // Đổi một tham số lọc trên URL (hãng / giá)
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next)
  }

  const filterLabel = typeFilter || brandFilter
    ? `${typeFilter ? `Loại: ${typeFilter}` : ''}${typeFilter && brandFilter ? ' · ' : ''}${brandFilter ? `Hãng: ${brandFilter}` : ''}`
    : null

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5 flex-wrap">
        <Link to="/" className="hover:text-[#1a73e8] transition">Trang chủ</Link>
        <ChevronRight size={13} />
        <span className="text-gray-400">Danh mục</span>
        {category && (
          <>
            <ChevronRight size={13} />
            <Link to={`/category/${slug}`} className="hover:text-[#1a73e8] transition font-medium text-gray-800">
              {category.name}
            </Link>
          </>
        )}
        {filterLabel && (
          <>
            <ChevronRight size={13} />
            <span className="font-medium text-gray-800">{filterLabel}</span>
          </>
        )}
      </nav>

      {/* Banner */}
      {catLoading ? (
        <div className="h-28 bg-gray-200 animate-pulse rounded-xl mb-6" />
      ) : category ? (
        <div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] rounded-xl px-6 py-5 text-white mb-6 flex items-center gap-5">
          {category.image && (
            <img
              src={category.image}
              alt={category.name}
              className="w-16 h-16 object-contain bg-white/10 rounded-xl p-2 shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{category.name}</h1>
            {filterLabel && (
              <p className="text-yellow-300 text-sm font-medium mt-0.5">{filterLabel}</p>
            )}
            {category.description && !filterLabel && (
              <p className="text-white/80 text-sm mt-0.5">{category.description}</p>
            )}
            <span className="inline-block mt-2 px-3 py-0.5 bg-white/20 rounded-full text-sm">
              {prodLoading ? '...' : visibleProducts.length} sản phẩm
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-400 rounded-xl px-6 py-5 text-white mb-6">
          <h1 className="text-2xl font-bold">Không tìm thấy danh mục</h1>
        </div>
      )}

      <div className="flex gap-6">
        {/* ── Sidebar ── */}
        {rootCategories.length > 0 && (
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm sticky top-24 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <LayoutGrid size={14} className="text-[#1a73e8]" />
                <span className="font-semibold text-sm text-gray-700">Xem theo loại</span>
              </div>
              <ul className="py-1.5">
                {rootCategories.map(cat => {
                  const isActive = cat.slug === slug && !typeFilter && !brandFilter
                  return (
                    <li key={cat._id}>
                      <Link
                        to={`/category/${cat.slug}`}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-[#1a73e8] font-semibold border-l-2 border-[#1a73e8]'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-[#1a73e8] border-l-2 border-transparent'
                        }`}
                      >
                        {cat.image && (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-6 h-6 object-contain shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                        <span className="leading-snug">{cat.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>
        )}

        {/* ── Nội dung chính ── */}
        <div className="flex-1 min-w-0">
          {/* Bộ lọc theo hãng và giá */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={brandFilter || ''}
              onChange={e => setFilter('brand', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">Tất cả hãng</option>
              {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={priceFilter}
              onChange={e => setFilter('price', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">Tất cả mức giá</option>
              <option value="0-5000000">Dưới 5 triệu</option>
              <option value="5000000-10000000">5 – 10 triệu</option>
              <option value="10000000-20000000">10 – 20 triệu</option>
              <option value="20000000-30000000">20 – 30 triệu</option>
              <option value="30000000-0">Trên 30 triệu</option>
            </select>
            {(brandFilter || priceFilter) && (
              <button onClick={() => { const n = new URLSearchParams(searchParams); n.delete('brand'); n.delete('price'); setSearchParams(n) }}
                className="text-sm text-[#1a73e8] underline">Xoá lọc</button>
            )}
          </div>

          {/* Grid sản phẩm */}
          {catLoading || prodLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-64" />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleProducts.map(product => (
                <ProductCard key={product._id} product={product as CardProduct} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Tag size={52} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-base mb-1">
                Chưa có sản phẩm trong danh mục này
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Vui lòng quay lại sau hoặc xem danh mục khác
              </p>
              {filterLabel && (
                <Link
                  to={`/category/${slug}`}
                  className="inline-block px-6 py-2 mb-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition mr-3"
                >
                  Xem tất cả {category?.name}
                </Link>
              )}
              <Link
                to="/"
                className="inline-block px-6 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
              >
                Về trang chủ
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CategoryPage
