import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/formatPrice'
import { Link, useNavigate } from 'react-router-dom'
import { entityId, type CartLine } from '../types'

function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart()
  const navigate = useNavigate()

  const getItemId = (item: CartLine): string => entityId(item)

  if (!isCartOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsCartOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag size={20} />
            Giỏ hàng ({cartItems.length})
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingBag size={64} className="mb-4" />
              <p className="text-lg font-medium">Giỏ hàng trống</p>
              <p className="text-sm mt-1">Hãy thêm sản phẩm vào giỏ hàng</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={getItemId(item)} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={item.image || item.images?.[0] || '/placeholder.png'}
                    alt={item.name}
                    className="w-20 h-20 object-contain bg-white rounded-lg shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium line-clamp-2">{item.name}</h4>
                    <p className="text-[#ff6b00] font-bold mt-1">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(getItemId(item), item.quantity - 1)}
                        className="w-7 h-7 bg-white border rounded flex items-center justify-center hover:bg-gray-100"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(getItemId(item), item.quantity + 1)}
                        className="w-7 h-7 bg-white border rounded flex items-center justify-center hover:bg-gray-100"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(getItemId(item))}
                        className="ml-auto p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tạm tính:</span>
              <span className="text-xl font-bold text-[#ff6b00]">{formatPrice(totalAmount)}</span>
            </div>
            <button
              onClick={() => { setIsCartOpen(false); navigate('/checkout') }}
              className="block w-full py-3 bg-[#ff6b00] text-white text-center rounded-lg font-bold hover:bg-[#e55d00] transition"
            >
              Thanh toán ngay
            </button>
            <Link
              to="/cart"
              onClick={() => setIsCartOpen(false)}
              className="block w-full py-2.5 border border-gray-200 text-gray-700 text-center rounded-lg font-medium hover:bg-gray-50 transition text-sm"
            >
              Xem giỏ hàng
            </Link>
            <button
              onClick={clearCart}
              className="block w-full py-2 text-red-500 text-center hover:bg-red-50 rounded-lg transition text-sm"
            >
              Xóa tất cả
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default CartDrawer
