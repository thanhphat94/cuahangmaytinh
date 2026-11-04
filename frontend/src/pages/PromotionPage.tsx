import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Percent, Clock, ArrowRight, Tag, Zap, Truck } from 'lucide-react'
import { productService } from '../services/productService'
import type { Product } from '../types'

/** `ProductCard` (đã convert) cần `discount?: number`, còn `types.Product.discount` là
 *  `number | string | null` — value truyền xuống không đổi, chỉ assertion ở biên render. */
type CardProduct = Product & { discount?: number }

const promoBanners = [
  {
    title: 'GIẢM 50%',
    subtitle: 'Camera an ninh Hikvision, Dahua, Uniarch',
    color: 'from-red-600 to-red-800',
    icon: <Percent size={28} />,
    filterSlug: 'camera-quan-sat',
    description: 'Áp dụng cho các camera IP, Wifi trong tháng này',
  },
  {
    title: 'FREESHIP',
    subtitle: 'Miễn phí vận chuyển đơn từ 500K',
    color: 'from-green-600 to-green-800',
    icon: <Truck size={28} />,
    filterSlug: null,
    description: 'Giao hàng toàn quốc, lắp đặt tận nơi TP.HCM',
  },
]

// Đếm ngược flash sale (reset mỗi ngày lúc 0h)
function useFlashSaleTimer() {
  const getSecondsUntilMidnight = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return Math.floor((midnight.getTime() - now.getTime()) / 1000)
  }

  const [seconds, setSeconds] = useState(getSecondsUntilMidnight)

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) return getSecondsUntilMidnight()
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return { h, m, s }
}

function PromotionPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const timer = useFlashSaleTimer()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productService.getDiscounted(20)
        // `productService` đã có kiểu AxiosResponse<Product[]> → nhánh `|| res` của bản JS là code
        // chết (không gán được AxiosResponse vào Product[]); giữ nguyên fallback `[]`.
        setProducts(res?.data || [])
      } catch (err) {
        console.error('PromotionPage load error:', err)
        // Fallback: lấy featured products nếu không có discounted
        try {
          const fallback = await productService.getFeatured()
          setProducts(fallback?.data || [])
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#ff6b00] to-[#ff8533] rounded-xl p-6 md:p-10 text-white mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Percent size={32} />
          <h1 className="text-3xl font-bold">KHUYẾN MÃI HOT</h1>
        </div>
        <p className="opacity-90">Săn deal giá sốc mỗi ngày - Giảm đến 50%</p>
        <div className="flex items-center gap-2 mt-4 text-sm">
          <Clock size={16} />
          <span>Ưu đãi có hạn - Nhanh tay kẻo lỡ!</span>
        </div>
      </div>

      {/* Flash Sale Timer */}
      <div className="mb-8 bg-[#1a1a2e] rounded-xl p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={20} className="text-yellow-400" />
              <h3 className="text-xl font-bold">FLASH SALE HÔM NAY</h3>
            </div>
            <p className="text-gray-400 text-sm">Kết thúc sau:</p>
          </div>
          <div className="flex gap-3">
            {[['Giờ', timer.h], ['Phút', timer.m], ['Giây', timer.s]].map(([label, val]) => (
              <div key={label} className="bg-white/10 rounded-lg p-3 text-center min-w-[60px]">
                <span className="text-2xl font-bold tabular-nums">{val}</span>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Banners – bấm vào đúng trang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {promoBanners.map((promo, index) => (
          <div key={index} className={`bg-gradient-to-r ${promo.color} rounded-xl p-6 text-white relative overflow-hidden`}>
            <div className="absolute top-3 right-3 opacity-20">{promo.icon}</div>
            <h3 className="text-2xl font-bold">{promo.title}</h3>
            <p className="opacity-90 mt-1 text-sm">{promo.subtitle}</p>
            <p className="opacity-75 mt-2 text-xs">{promo.description}</p>
            {promo.filterSlug ? (
              <Link
                to={`/category/${promo.filterSlug}`}
                className="inline-flex items-center gap-1 mt-4 text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition"
              >
                Xem ngay <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                to="/products"
                className="inline-flex items-center gap-1 mt-4 text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition"
              >
                Xem ngay <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Products đang giảm giá – từ database */}
      <div className="flex items-center gap-2 mb-6">
        <Tag size={20} className="text-[#ff6b00]" />
        <h2 className="text-xl font-bold">Sản phẩm đang giảm giá</h2>
        <span className="text-sm text-gray-400 ml-auto">{products.length} sản phẩm</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product._id || product.id} product={product as CardProduct} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p>Chưa có sản phẩm khuyến mãi</p>
          <Link to="/" className="mt-4 inline-block text-[#1a73e8] hover:underline">
            Về trang chủ
          </Link>
        </div>
      )}
    </div>
  )
}

export default PromotionPage
