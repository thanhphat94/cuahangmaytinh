import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Minus, Plus, ShoppingCart, Truck, Shield, RotateCcw, Heart,
  Share2, ChevronRight, Star, Eye, Package, CheckCircle, AlertCircle,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../utils/formatPrice'
import ProductCard from '../components/ProductCard'
import ProductReviews from '../components/ProductReviews'
import { productService } from '../services/productService'
import { useSEO } from '../hooks/useSEO'
import { getErrorMessage } from '../api/api'
import type { Product } from '../types'

/**
 * Trang này đọc `rating` / `reviewCount` — di sản bản MongoDB, backend Prisma không trả,
 * nên khai báo local thay vì thêm vào `types/index.ts`.
 */
type ProductDetail = Product & {
  rating?: number;
  reviewCount?: number;
}

/** `ProductCard` (đã convert) cần `discount?: number`, `types.Product.discount` để `number | string | null`. */
type CardProduct = Product & { discount?: number }

// ─── Skeleton ────────────────────────────────────────────────
function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}

// ─── Stars ───────────────────────────────────────────────────
function StarRating({ rating = 0, count = 0 }: { rating?: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < Math.floor(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : i < rating
                ? 'text-yellow-400 fill-yellow-200'
                : 'text-gray-300 fill-gray-100'
            }
          />
        ))}
      </div>
      <span className="text-sm text-gray-500">({count} đánh giá)</span>
    </div>
  )
}

// ─── Stock badge ─────────────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
        <AlertCircle size={15} /> Hết hàng
      </span>
    )
  if (stock <= 5)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-orange-500 font-medium">
        <Package size={15} /> Còn {stock} sản phẩm
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
      <CheckCircle size={15} /> Còn hàng
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────
function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { toggleWishlist, isInWishlist } = useWishlist()

  const [product, setProduct]           = useState<ProductDetail | null>(null)

  // ✅ SEO động — cập nhật khi product load xong
  useSEO({
    title:       product?.name,
    description: product?.description?.slice(0, 155) || `Mua ${product?.name || ''} chính hãng tại Cửa Hàng Máy Tính`,
    image:       product?.images?.[0],
    url:         product ? `/product/${product.slug}` : undefined,
    type:        'product',
  })
  const [related, setRelated]           = useState<Product[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [quantity, setQuantity]         = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [activeTab, setActiveTab]       = useState('description')
  const [addedMsg, setAddedMsg]         = useState(false)
  const [reviewStats, setReviewStats]   = useState({ average: 0, count: 0 })

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    setSelectedImage(0)
    setQuantity(1)

    const load = async () => {
      try {
        const res = await productService.getBySlug(slug)
        // `productService.getBySlug` đã có kiểu AxiosResponse<Product> → nhánh `|| res` của bản JS
        // là code chết; `res?.data` rỗng (product không tồn tại) vẫn throw như cũ.
        const p = res?.data ?? null
        if (!p) throw new Error('Không tìm thấy sản phẩm')
        setProduct(p)

        // Lấy sản phẩm liên quan cùng danh mục.
        // `mapId()` trả `categoryId` hoặc là chuỗi id hoặc là object `{ id, name, slug, _id }`
        // (xem `backend/src/services/productService.ts:23-25`), nên lấy id từ `category` trước,
        // `categoryId` chỉ là fallback khi nó là chuỗi.
        const catId = p.category?.id ?? (typeof p.categoryId === 'string' ? p.categoryId : p.categoryId?.id)
        if (catId) {
          const relRes = await productService.getAll({ category: catId, limit: 6 })
          // `getAll` trả `{ products, total, totalPages, currentPage }` — bỏ các nhánh đọc thẳng
          // `relRes.products` / `relRes.data` của bản JS vì không hợp kiểu AxiosResponse.
          const allRel = relRes?.data?.products ?? []
          setRelated(allRel.filter((r) => String(r._id) !== String(p._id)).slice(0, 4))
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Lỗi tải sản phẩm'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const handleAddToCart = async () => {
    if (!product || product.stock === 0) return
    await addToCart(product, quantity)
    setAddedMsg(true)
    setTimeout(() => setAddedMsg(false), 2000)
  }

  const handleBuyNow = async () => {
    if (!product || product.stock === 0) return
    await addToCart(product, quantity) // chờ giỏ cập nhật xong rồi mới sang trang thanh toán
    navigate('/checkout')
  }

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href)
      .then(() => alert('Đã copy link sản phẩm!'))
      .catch(() => {})
  }

  const discount =
    product?.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0

  const images =
    product?.images?.length
      ? product.images
      : ['/placeholder.png', '/placeholder.png', '/placeholder.png', '/placeholder.png']

  // ─── Error state ──────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="container py-20 text-center">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-[#1a73e8] text-white rounded-lg">
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link to="/" className="hover:text-[#1a73e8]">Trang chủ</Link>
        <ChevronRight size={14} />
        {product?.category && (
          <>
            <Link
              to={`/category/${product.category?.slug || ''}`}
              className="hover:text-[#1a73e8]"
            >
              {product.category?.name || 'Danh mục'}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="text-gray-800 truncate max-w-xs">
          {loading ? '...' : product?.name}
        </span>
      </nav>

      {/* Product Detail */}
      {/* `!product` chỉ là guard để TS narrow: mọi nhánh lỗi đều đã return ở khối error phía trên,
          nên khi `loading === false` thì `product` luôn đã load. */}
      {loading || !product ? (
        <ProductDetailSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Images ─────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-contain p-6"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-lg">
                  -{discount}%
                </span>
              )}
              {product.isNewProduct && (
                <span className="absolute top-4 right-4 px-3 py-1.5 bg-[#1a73e8] text-white text-sm font-bold rounded-lg">
                  MỚI
                </span>
              )}
            </div>
            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {images.slice(0, 4).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 transition ${
                    selectedImage === idx ? 'border-[#1a73e8]' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-contain p-2"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ── Info ────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Category & Brand */}
            <div className="flex items-center gap-3">
              {product.category?.name && (
                <Link
                  to={`/category/${product.category?.slug || ''}`}
                  className="text-sm bg-[#1a73e8]/10 text-[#1a73e8] px-3 py-1 rounded-full font-medium hover:bg-[#1a73e8]/20 transition"
                >
                  {product.category?.name}
                </Link>
              )}
              {product.brand && (
                <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                  {product.brand}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 leading-snug">
              {product.name}
            </h1>

            {/* Lượt xem */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              {(product.viewCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Eye size={13} /> {product.viewCount} lượt xem
                </span>
              )}
            </div>

            {/* Rating */}
            <StarRating rating={reviewStats.count ? reviewStats.average : product.rating || 0} count={reviewStats.count || product.reviewCount || 0} />

            {/* Price */}
            <div className="flex items-end gap-3 pt-1">
              <span className="text-3xl font-black text-[#ff6b00]">
                {product.price === 0 ? 'Liên hệ' : formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-lg text-gray-400 line-through mb-0.5">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {discount > 0 && (
                <span className="text-sm font-bold text-white bg-red-500 px-2 py-0.5 rounded mb-0.5">
                  -{discount}%
                </span>
              )}
            </div>

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-gray-600 leading-relaxed text-sm border-l-4 border-[#1a73e8]/30 pl-3">
                {product.shortDescription}
              </p>
            )}

            {/* Stock */}
            <StockBadge stock={product.stock ?? 99} />

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { Icon: Truck,      text: 'Miễn phí vận chuyển' },
                { Icon: Shield,     text: product.warranty || 'Bảo hành 24 tháng' },
                { Icon: RotateCcw,  text: 'Đổi trả 7 ngày'      },
                { Icon: CheckCircle, text: 'Chính hãng 100%'     },
              ].map(({ Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Icon size={17} className="text-[#1a73e8] shrink-0" />
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
              ))}
            </div>

            {/* Quantity + CTA */}
            <div className="space-y-3 pt-4 border-t">
              {/* Row 1: quantity + add to cart */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-11 flex items-center justify-center hover:bg-gray-100 transition"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-12 text-center font-bold text-base">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                    className="w-10 h-11 flex items-center justify-center hover:bg-gray-100 transition"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-1 min-w-[160px] py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${
                    addedMsg
                      ? 'bg-green-500 text-white'
                      : product.stock === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#ff6b00] text-white hover:bg-[#e55d00]'
                  }`}
                >
                  <ShoppingCart size={18} />
                  {addedMsg ? 'Đã thêm ✓' : product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
                </button>

                <button
                  onClick={() => toggleWishlist(product)}
                  className={`w-11 h-11 border-2 rounded-lg flex items-center justify-center transition ${
                    isInWishlist(product._id || product.id)
                      ? 'border-red-400 bg-red-50 text-red-500'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-500'
                  }`}
                  title={isInWishlist(product._id || product.id) ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                >
                  <Heart
                    size={18}
                    className={isInWishlist(product._id || product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                  />
                </button>
                <button
                  onClick={handleShare}
                  className="w-11 h-11 border-2 border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"
                >
                  <Share2 size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Row 2: Mua ngay */}
              <button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="w-full py-3 bg-[#1a73e8] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1557b0] transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Mua ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      {!loading && product && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex border-b overflow-x-auto">
            {[
              { key: 'description', label: 'Mô tả sản phẩm' },
              { key: 'specs',       label: 'Thông số kỹ thuật' },
              { key: 'reviews',     label: 'Đánh giá' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-4 font-medium transition whitespace-nowrap shrink-0 ${
                  activeTab === key
                    ? 'text-[#1a73e8] border-b-2 border-[#1a73e8]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Description */}
            {activeTab === 'description' && (
              <div className="prose max-w-none text-gray-700 leading-relaxed space-y-3">
                <p>{product.description || product.shortDescription || 'Chưa có mô tả chi tiết.'}</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Sản phẩm chính hãng, nguyên seal</li>
                  <li>Bảo hành {product.warranty || '24 tháng'} tại trung tâm bảo hành chính hãng</li>
                  <li>Hỗ trợ kỹ thuật và cài đặt miễn phí</li>
                  <li>Đổi trả trong vòng 7 ngày nếu có lỗi từ nhà sản xuất</li>
                </ul>
              </div>
            )}

            {/* Specs */}
            {activeTab === 'specs' && (
              <div className="space-y-2">
                {/* Static fields */}
                {[
                  { label: 'Thương hiệu', value: product.brand },
                  { label: 'Danh mục',    value: product.category?.name },
                  { label: 'Bảo hành',    value: product.warranty || '24 tháng' },
                  { label: 'Đơn vị',      value: product.unit || 'Cái' },
                ]
                  .filter((s) => s.value)
                  .map((spec, i) => (
                    <div key={i} className="flex py-2.5 border-b border-gray-100">
                      <span className="w-44 text-gray-500 text-sm shrink-0">{spec.label}</span>
                      <span className="font-medium text-gray-800 text-sm">{spec.value}</span>
                    </div>
                  ))}
                {/* Dynamic specs from DB */}
                {product.specs?.map((spec, i) => (
                  <div key={i} className="flex py-2.5 border-b border-gray-100">
                    <span className="w-44 text-gray-500 text-sm shrink-0">{spec.key}</span>
                    <span className="font-medium text-gray-800 text-sm">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'reviews' && (
              <ProductReviews
                productId={product._id || product.id}
                onStats={(average, count) => setReviewStats({ average, count })}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Related products ──────────────────────────────────── */}
      {related.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-5 text-gray-800">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p._id || p.id} product={p as CardProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductPage
