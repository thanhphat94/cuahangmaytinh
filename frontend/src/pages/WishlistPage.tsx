import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../utils/formatPrice'
import type { Product } from '../types'

function WishlistPage() {
  const { addToCart } = useCart()
  // FIX BUG CÓ SẴN: bản JS destruct `wishlistItems` — context không có key đó (nó là `wishlist`),
  // nên trang chạy thật sẽ throw khi đọc `.length`. Đổi sang đúng key, không đổi hành vi khác.
  const { wishlist, removeFromWishlist } = useWishlist()

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Heart size={24} className="text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>
        <span className="ml-1 text-gray-400 font-normal text-base">({wishlist.length})</span>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Chưa có sản phẩm yêu thích</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Bấm vào biểu tượng ❤️ trên sản phẩm để thêm vào danh sách yêu thích
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlist.map(item => {
            const id = item._id || item.id
            return (
              <div
                key={id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
              >
                <img
                  src={item.images?.[0] || item.image || '/placeholder.png'}
                  alt={item.name}
                  className="w-24 h-24 object-contain bg-gray-50 rounded-lg shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.slug || id}`}
                    className="font-medium hover:text-[#1a73e8] transition line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-bold text-[#ff6b00]">{formatPrice(item.price ?? 0)}</span>
                    {item.originalPrice && item.originalPrice > (item.price ?? 0) && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(item.originalPrice)}
                      </span>
                    )}
                    {Number(item.discount) > 0 && (
                      <span className="text-xs text-red-500 font-medium">-{item.discount}%</span>
                    )}
                  </div>
                  {item.status === 'out_of_stock' && (
                    <span className="text-xs text-red-500 mt-1 block">Hết hàng</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    // WishlistEntry là `Partial<Product>` (bản chưa login chỉ giữ id), còn
                    // `useCart().addToCart` nhận `Product` — giữ đúng object đang hiển thị khi thêm giỏ.
                    onClick={() => addToCart(item as Product)}
                    disabled={item.status === 'out_of_stock'}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={16} />
                    Thêm giỏ
                  </button>
                  <button
                    onClick={() => removeFromWishlist(id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Xóa khỏi yêu thích"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}

          <div className="flex justify-between items-center pt-4">
            <Link to="/" className="flex items-center gap-1 text-[#1a73e8] hover:text-[#ff6b00] transition">
              <ArrowRight size={16} className="rotate-180" />
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default WishlistPage
