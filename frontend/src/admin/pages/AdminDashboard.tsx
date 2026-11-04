import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, DollarSign, ShoppingCart, Users, Package,
  ArrowUpRight, ArrowDownRight, Calendar, X, Phone, Mail, MapPin, Loader2
} from 'lucide-react'
import api from '../../api/api'
import { useToast } from '../../components/Toast'

// Fake data removed

type ChartBar = { month: string; value: number }
type TopProduct = { name: string; image?: string | null; sold: number; revenue: number }
type OrderUser = { fullName?: string; email?: string }
type OrderCustomerInfo = { fullName?: string; phone?: string; email?: string; address?: string }
type RecentOrder = {
  id: string
  orderCode: string
  createdAt: string
  finalAmount: number
  totalAmount?: number
  shippingFee?: number
  discount?: number
  voucherCode?: string | null
  status: string
  paymentMethod?: string
  paymentStatus?: string
  note?: string | null
  userId?: OrderUser | null
  customerInfo?: OrderCustomerInfo | null
  items?: { name?: string | null; image?: string | null; variant?: string | null; quantity?: number | null; price?: number | null }[]
}

/** Shape `GET /admin/stats` — không có trong shared `types/index.ts`, khai báo local. */
type AdminStats = {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalProducts: number
  chartDataByYear?: Record<string, ChartBar[]>
  topProducts?: TopProduct[]
  recentOrders?: RecentOrder[]
}

// Trạng thái đơn — khớp với trang Đơn hàng (STATUS_CONFIG)
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Đang xử lý',   color: 'bg-blue-100 text-blue-700' },
  shipping:  { label: 'Đang giao',    color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: 'Đã giao',      color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Đã hủy',       color: 'bg-red-100 text-red-700' },
}

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'COD (nhận hàng)', bank_transfer: 'Chuyển khoản', momo: 'Ví MoMo', vnpay: 'VNPay',
}

const formatVND = (n?: number | null) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

function AdminDashboard() {
  const toast = useToast()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null)
  const [data, setData] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<AdminStats>('/admin/stats')
        setData(res.data)
      } catch {
        toast.error('Không thể tải dữ liệu dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#1a73e8]" size={32} />
      </div>
    )
  }

  const statsList = [
    {
      title: 'Tổng doanh thu',
      value: new Intl.NumberFormat('vi-VN').format(data?.totalRevenue || 0) + 'đ',
      change: '---',
      trend: 'up',
      icon: DollarSign,
      color: 'bg-green-500',
      link: '/admin/orders'
    },
    {
      title: 'Đơn hàng mới',
      value: data?.totalOrders || 0,
      change: '---',
      trend: 'up',
      icon: ShoppingCart,
      color: 'bg-blue-500',
      link: '/admin/orders'
    },
    {
      title: 'Người dùng mới',
      value: data?.totalUsers || 0,
      change: '---',
      trend: 'up',
      icon: Users,
      color: 'bg-purple-500',
      link: '/admin/users'
    },
    {
      title: 'Sản phẩm',
      value: data?.totalProducts || 0,
      change: '---',
      trend: 'up',
      icon: Package,
      color: 'bg-orange-500',
      link: '/admin/products'
    },
  ]

  const chartData = data?.chartDataByYear?.[selectedYear] || []

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsList.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Link
              key={index}
              to={stat.link}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {stat.trend === 'up' ? (
                  <ArrowUpRight size={16} className="text-green-500" />
                ) : (
                  <ArrowDownRight size={16} className="text-red-500" />
                )}
                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.change}
                </span>
                <span className="text-gray-400 text-sm">so với tháng trước</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Doanh thu theo tháng</h3>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1 focus:outline-none focus:border-[#1a73e8]"
            >
              {Object.keys(data?.chartDataByYear || {}).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          {/* ✅ FIX: Normalize height theo giá trị lớn nhất thay vì nhân cứng */}
          <div className="h-64 flex items-end justify-between gap-2 px-2">
            {chartData.length > 0 ? (() => {
              const maxVal = Math.max(...chartData.map(b => b.value), 0.001)
              return chartData.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-[#1a73e8] rounded-t-lg transition-all hover:bg-[#ff6b00] relative group cursor-pointer"
                    style={{ height: `${Math.max((bar.value / maxVal) * 220, bar.value > 0 ? 4 : 0)}px` }}
                  >
                    {bar.value > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                        {(bar.value * 1000000).toLocaleString('vi-VN')}đ
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{bar.month}</span>
                </div>
              ))
            })() : <p className="text-sm text-gray-400 w-full text-center mb-10">Chưa có dữ liệu</p>}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-lg mb-4">Sản phẩm bán chạy</h3>
          <div className="space-y-3">
            {data?.topProducts && data.topProducts.length > 0 ? data.topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                  {index + 1}
                </span>
                <img src={product.image || 'https://via.placeholder.com/100'} alt={product.name} className="w-10 h-10 object-contain bg-gray-50 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sold} đã bán</p>
                </div>
                <span className="text-sm font-bold text-[#ff6b00]">
                  {(product.revenue / 1000000).toFixed(1)}M
                </span>
              </div>
            )) : <p className="text-sm text-gray-400">Chưa có dữ liệu</p>}
          </div>
          <Link
            to="/admin/products"
            className="block text-center mt-4 text-sm text-[#1a73e8] hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Đơn hàng gần đây</h3>
          <Link to="/admin/orders" className="text-sm text-[#1a73e8] hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Mã đơn</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Khách hàng</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ngày</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tổng tiền</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentOrders && data.recentOrders.length > 0 ? data.recentOrders.map((order, index) => (
                <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-3 px-4 font-medium">{order.orderCode}</td>
                  <td className="py-3 px-4">{order.customerInfo?.fullName || order.userId?.fullName || 'Khách vãng lai'}</td>
                  <td className="py-3 px-4 text-gray-500 text-sm">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="py-3 px-4 text-right font-bold">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.finalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[order.status]?.color || 'bg-gray-100'}`}>
                      {STATUS_CONFIG[order.status]?.label || order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-[#1a73e8] hover:underline text-sm font-medium cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Chưa có đơn hàng nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Thêm sản phẩm', icon: Package, color: 'bg-blue-500', link: '/admin/products' },
          { label: 'Thêm đơn hàng', icon: ShoppingCart, color: 'bg-green-500', link: '/admin/orders' },
          { label: 'Thêm tin tức', icon: Calendar, color: 'bg-purple-500', link: '/admin/news' },
          { label: 'Xem báo cáo', icon: TrendingUp, color: 'bg-orange-500', link: '/admin/orders' },
        ].map((action, index) => {
          const Icon = action.icon
          return (
            <Link
              key={index}
              to={action.link}
              className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
            >
              <div className={`${action.color} p-2 rounded-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <span className="font-medium text-sm">{action.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-lg">Chi tiết đơn hàng {selectedOrder.orderCode}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 text-left">
              {/* Trạng thái + thanh toán */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedOrder.status]?.color || 'bg-gray-100'}`}>
                  {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                </span>
                {selectedOrder.paymentMethod && (
                  <span className="text-gray-600">{PAYMENT_LABELS[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                  {selectedOrder.paymentStatus === 'paid' ? '✓ Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm text-gray-800">Thông tin khách hàng</h4>
                <p className="text-sm font-semibold">
                  {selectedOrder.customerInfo?.fullName || selectedOrder.userId?.fullName || 'Khách vãng lai'}
                  {!selectedOrder.userId && <span className="ml-2 text-xs font-normal text-gray-400">(khách vãng lai)</span>}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-2"><Phone size={14} /> {selectedOrder.customerInfo?.phone || 'Chưa có'}</p>
                <p className="text-sm text-gray-500 flex items-center gap-2"><Mail size={14} /> {selectedOrder.customerInfo?.email || selectedOrder.userId?.email || 'Chưa có'}</p>
                <p className="text-sm text-gray-500 flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0" /> {selectedOrder.customerInfo?.address || 'Chưa có'}</p>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium text-sm text-gray-800 mb-2">Sản phẩm</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image
                            ? <img src={item.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-100 shrink-0" />
                            : <Package size={16} className="text-gray-400 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.name || 'Sản phẩm'}</p>
                            <p className="text-xs text-gray-500">
                              {formatVND(item.price)} x {item.quantity || 1}{item.variant ? ` · ${item.variant}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-sm shrink-0">{formatVND((item.price || 0) * (item.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Đơn hàng không có sản phẩm</p>
                )}
              </div>

              {selectedOrder.note && (
                <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                  <span className="font-medium">Ghi chú:</span> {selectedOrder.note}
                </p>
              )}

              {/* Tổng kết */}
              <div className="space-y-1.5 pt-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Tạm tính</span><span>{formatVND(selectedOrder.totalAmount)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Phí vận chuyển</span><span>{selectedOrder.shippingFee ? formatVND(selectedOrder.shippingFee) : 'Miễn phí'}</span></div>
                {!!selectedOrder.discount && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá{selectedOrder.voucherCode ? ` (${selectedOrder.voucherCode})` : ''}</span>
                    <span>-{formatVND(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="font-bold">Tổng cộng:</span>
                  <span className="font-bold text-xl text-[#ff6b00]">{formatVND(selectedOrder.finalAmount ?? selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Link to="/admin/orders" className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Quản lý đơn hàng
              </Link>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
