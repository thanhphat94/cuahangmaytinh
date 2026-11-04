import { useEffect, useState } from 'react'
import { useSEO } from '../hooks/useSEO'
import HeroBanner from '../components/HeroBanner'
import ProductCard from '../components/ProductCard'
import SectionTitle from '../components/SectionTitle'
import CategoryCard from '../components/CategoryCard'
import ServiceBanner from '../components/ServiceBanner'
import NotificationTicker from '../components/NotificationTicker'
import { CATEGORIES } from '../utils/constants'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import { productService } from '../services/productService'
import type { Product } from '../types'

/**
 * `ProductCard` đọc badge `discount` kiểu `number`, còn `types/index.Product.discount`
 * để `number | string | null` (di sản MongoDB) — thu hẹp ở call site render card.
 */
type CardProduct = Product & { discount?: number }

// ─── Thương hiệu với logo local SVG 100% offline ───────────────────────────────
const BRANDS = [
  {
    name: 'Hikvision',
    logo: '/images/brands/hikvision.svg',
    bg: '#fff0f0',
    slug: 'Hikvision',
  },
  {
    name: 'Dahua',
    logo: '/images/brands/dahua.svg',
    bg: '#e8f3ff',
    slug: 'Dahua',
  },
  {
    name: 'HP',
    logo: '/images/brands/hp.svg',
    bg: '#f0f4ff',
    slug: 'HP',
  },
  {
    name: 'Canon',
    logo: '/images/brands/canon.svg',
    bg: '#fff0f0',
    slug: 'Canon',
  },
  {
    name: 'Pantum',
    logo: '/images/brands/pantum.svg',
    bg: '#f0f0ff',
    slug: 'Pantum',
  },
  {
    name: 'Uniarch',
    logo: '/images/brands/uniarch.svg',
    bg: '#e8f9ef',
    slug: 'Uniarch',
  },
  {
    name: 'Ruijie',
    logo: '/images/brands/ruijie.svg',
    bg: '#fff0f2',
    slug: 'Ruijie',
  },
  {
    name: 'Dell',
    logo: '/images/brands/dell.svg',
    bg: '#e8f3ff',
    slug: 'Dell',
  },
]

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function ProductSkeleton() {
  useSEO({ title: 'Trang chủ', description: 'Mua sắm máy tính, máy in, camera, thiết bị mạng chính hãng. Giao hàng nhanh toàn quốc, bảo hành uy tín.', url: '/' })
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-8 bg-gray-200 rounded mt-3" />
      </div>
    </div>
  )
}

function HomePage() {
  const [hotDeals, setHotDeals]       = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [loading, setLoading]         = useState(true)

  const { ref: hotRef, isVisible: hotVisible } = useScrollAnimation()
  const { ref: newRef, isVisible: newVisible } = useScrollAnimation()
  const { ref: catRef, isVisible: catVisible } = useScrollAnimation()

  useEffect(() => {
    const load = async () => {
      try {
        const [featuredRes, newRes] = await Promise.all([
          productService.getFeatured(),
          productService.getNewProducts(),
        ])
        // `productService` luôn trả `AxiosResponse<Product[]>` nên nhánh `|| featuredRes`
        // của code gốc là code chết — giữ nguyên `|| []` cho nhánh còn lại.
        setHotDeals(featuredRes?.data || [])
        setNewProducts(newRes?.data || [])
      } catch (err) {
        console.error('HomePage load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-0 pb-12">
      {/* Notification Ticker */}
      <NotificationTicker />

      {/* Hero Banner */}
      <section className="container pt-4">
        <HeroBanner />
      </section>

      {/* Service Banner */}
      <section className="container mt-4">
        <ServiceBanner />
      </section>

      {/* Categories */}
      <section className="container mt-8" ref={catRef}>
        <SectionTitle
          title="Danh mục sản phẩm"
          subtitle="Khám phá các danh mục sản phẩm của chúng tôi"
          link="/search"
          showLink={true}
        />
        <div
          className={`grid grid-cols-3 md:grid-cols-6 gap-4 transition-all duration-700 ${
            catVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {/* Hot Deals */}
      <section className="container mt-8" ref={hotRef}>
        <SectionTitle
          title="HOT DEALS"
          subtitle="Sản phẩm giảm giá sốc – Xoay vòng mỗi tuần"
          link="/khuyen-mai"
        />
        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-700 ${
            hotVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)
            : hotDeals.length > 0
            ? hotDeals.map((product) => (
                <ProductCard key={product._id || product.id} product={product as CardProduct} />
              ))
            : <p className="col-span-4 text-center text-gray-400 py-8">Chưa có sản phẩm nổi bật</p>
          }
        </div>
      </section>

      {/* Promo Banner */}
      <section className="container mt-8">
        <div className="bg-gradient-to-r from-[#ff6b00] to-[#ff8533] rounded-xl p-6 md:p-10 text-white flex items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">BEST DEALS!!</h3>
            <p className="opacity-90">Camera, Máy in, Linh kiện máy tính giảm đến 50%</p>
          </div>
          <a
            href="/khuyen-mai"
            className="px-6 py-3 bg-white text-[#ff6b00] rounded-lg font-bold hover:bg-gray-100 transition shrink-0"
          >
            MUA NGAY
          </a>
        </div>
      </section>

      {/* New Products */}
      <section className="container mt-8" ref={newRef}>
        <SectionTitle
          title="Sản phẩm mới"
          subtitle="Những sản phẩm mới nhất vừa về hàng"
          link="/search?sort=newest"
          showLink={true}
        />
        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-700 ${
            newVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)
            : newProducts.length > 0
            ? newProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product as CardProduct} />
              ))
            : <p className="col-span-4 text-center text-gray-400 py-8">Chưa có sản phẩm mới</p>
          }
        </div>
      </section>

      {/* Brands – hiển thị logo thực */}
      <section className="container mt-8">
        <SectionTitle title="Thương hiệu nổi bật" showLink={false} />
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {BRANDS.map((brand) => (
            <div
              key={brand.name}
              className="group bg-white rounded-xl p-3 flex flex-col items-center justify-center h-24 shadow-sm border border-gray-100 cursor-default select-none transition"
            >
              <div
                className="w-14 h-10 flex items-center justify-center mb-2 rounded overflow-hidden"
                style={{ backgroundColor: brand.bg }}
              >
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-xs font-semibold text-gray-600 transition text-center leading-tight">
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
