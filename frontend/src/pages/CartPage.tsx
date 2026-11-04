import { useSEO } from '../hooks/useSEO'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { formatPrice } from '../utils/formatPrice'
import type { CartLine } from '../types'

function CartPage() {
  useSEO({ title: 'Giỏ hàng', url: '/cart' })
  const { cartItems, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart()
  const { settings } = useSiteSettings()
  const navigate = useNavigate()

  const shippingFee = totalAmount >= settings.freeShippingFrom ? 0 : settings.defaultShippingFee
  const finalTotal = totalAmount + shippingFee

  const getItemId = (item: CartLine): string => item._id || item.id

  if (cartItems.length === 0) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag size={80} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng của bạn</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition"
          >
            <ArrowLeft size={18} />
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Giỏ hàng ({cartItems.length} sản phẩm)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 text-sm font-medium text-gray-500">
              <div className="col-span-6">Sản phẩm</div>
              <div className="col-span-2 text-center">Đơn giá</div>
              <div className="col-span-2 text-center">Số lượng</div>
              <div className="col-span-2 text-right">Thành tiền</div>
            </div>

            {cartItems.map((item) => (
              <div key={getItemId(item)} className="p-4 border-t border-gray-100">
                <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                  {/* Product info */}
                  <div className="md:col-span-6 flex items-center gap-4 w-full">
                    <img
                      src={item.image || item.images?.[0] || '/placeholder.png'}
                      alt={item.name}
                      className="w-20 h-20 object-contain bg-gray-50 rounded-lg shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/product/${item.slug || getItemId(item)}`}
                        className="font-medium text-gray-800 hover:text-[#1a73e8] transition line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      <button
                        onClick={() => removeFromCart(getItemId(item))}
                        className="flex items-center gap-1 text-red-500 text-sm mt-1 hover:text-red-700 transition"
                      >
                        <Trash2 size={14} />
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="md:col-span-2 text-center">
                    <span className="font-bold text-[#ff6b00]">{formatPrice(item.price)}</span>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2 flex items-center justify-center">
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => updateQuantity(getItemId(item), item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(getItemId(item), item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="md:col-span-2 text-right">
                    <span className="font-bold text-lg">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-[#1a73e8] font-medium hover:text-[#ff6b00] transition"
            >
              <ArrowLeft size={18} />
              Tiếp tục mua sắm
            </Link>
            <button
              onClick={clearCart}
              className="text-red-500 font-medium hover:text-red-700 transition"
            >
              Xóa tất cả
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h3 className="font-bold text-lg mb-4">Tóm tắt đơn hàng</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tạm tính</span>
                <span className="font-medium">{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span className={shippingFee === 0 ? 'text-green-500 font-medium' : 'font-medium'}>
                  {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">Tổng cộng</span>
                <span className="font-bold text-xl text-[#ff6b00]">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {shippingFee > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-[#1a73e8]">
                <Truck size={16} />
                Mua thêm {formatPrice(Math.max(0, settings.freeShippingFrom - totalAmount))} để được miễn phí vận chuyển
              </div>
            )}

            <button
              onClick={() => navigate('/checkout')}
              className="w-full mt-6 py-3 bg-[#ff6b00] text-white rounded-lg font-bold hover:bg-[#e55d00] transition"
            >
              Tiến hành thanh toán
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
