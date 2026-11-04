import { type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../utils/formatPrice'
import { entityId, type Product } from '../types'

/** `Product` từ API + vài field trình diễn mà `ProductCard` đọc nhưng `types/index.ts` không khai báo. */
type CardProduct = Product & {
  isHot?: boolean;
  isNew?: boolean;
  discount?: number;
  status?: string;
  image?: string | null;
}

type Props = { product: CardProduct }

function ProductCard({ product }: Props) {
  const { addToCart } = useCart()
  const { toggleWishlist, isInWishlist } = useWishlist()

  const id = entityId(product)
  const inWishlist = isInWishlist(id)

  const handleAddToCart = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
  }

  const handleToggleWishlist = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  return (
    <div className="product-card bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100">
      <Link to={`/product/${product.slug || id}`} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={product.images?.[0] || product.image || '/images/news-placeholder.svg'}
            alt={product.name}
            className="product-image w-full h-full object-contain p-4"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/images/news-placeholder.svg';
            }}
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {product.isHot && (
              <span className="px-2 py-1 bg-[#ff6b00] text-white text-xs font-bold rounded">HOT</span>
            )}
            {product.isNew && (
              <span className="px-2 py-1 bg-[#1a73e8] text-white text-xs font-bold rounded">MỚI</span>
            )}
            {(product.discount ?? 0) > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                -{product.discount}%
              </span>
            )}
          </div>
          {/* Quick actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleWishlist}
              className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition ${
                inWishlist
                  ? 'bg-red-500 text-white'
                  : 'bg-white hover:bg-red-500 hover:text-white'
              }`}
              title={inWishlist ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            >
              <Heart size={14} className={inWishlist ? 'fill-white' : ''} />
            </button>
            <button className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-[#1a73e8] hover:text-white transition">
              <Eye size={14} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 hover:text-[#1a73e8] transition min-h-[40px]">
            {product.name}
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-lg font-bold text-[#ff6b00]">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          {product.status === 'out_of_stock' && (
            <span className="text-xs text-red-500 font-medium mt-1 block">Hết hàng</span>
          )}
          {product.status === 'contact' && (
            <span className="text-xs text-[#1a73e8] font-medium mt-1 block">Liên hệ tư vấn</span>
          )}
        </div>
      </Link>

      {/* Add to cart button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAddToCart}
          disabled={product.status === 'out_of_stock'}
          className="w-full py-2.5 bg-[#1a73e8] text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#1557b0] transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={16} />
          {product.status === 'out_of_stock' ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      </div>
    </div>
  )
}

export default ProductCard
