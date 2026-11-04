import React, { useState, useEffect, useCallback } from 'react'
import { useSEO } from '../hooks/useSEO'
import { Link } from 'react-router-dom'
import {
  Package, Truck, CheckCircle, Clock, XCircle, RefreshCw,
  ShoppingBag, ChevronDown, ChevronUp, MapPin, Phone, User,
  CreditCard, Tag, AlertCircle, Loader2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatPrice } from '../utils/formatPrice'
import api, { getErrorMessage } from '../api/api'
import { useToast } from '../components/Toast'
import type { Order, OrderStatus, PaymentMethod } from '../types'

/**
 * BUG CÓ SẴN: tab này đọc `order.customerInfo?.fullName/phone/address`, nhưng `Order`
 * (`types/index.ts` + Prisma `model Order`) chỉ có field phẳng `customerFullName/customerPhone/customerAddress`
 * → khối "Thông tin nhận hàng" luôn trống. Giữ nguyên hành vi khi migrate, chỉ khai báo thêm
 * field optional ở đây để TS mô tả đúng những gì code đọc (không sửa file shared).
 */
type OrderRow = Order & {
  customerInfo?: { fullName?: string | null; phone?: string | null; address?: string | null };
}

type StatusConfig = {
  label: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

// ─── Trạng thái đơn hàng (khớp backend enum) ──────────────
const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Chờ xác nhận',
    Icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  confirmed: {
    label: 'Đang xử lý',
    Icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  shipping: {
    label: 'Đang giao hàng',
    Icon: Truck,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  completed: {
    label: 'Đã giao hàng',
    Icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  cancelled: {
    label: 'Đã hủy',
    Icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

const TABS = [
  { key: 'all',       label: 'Tất cả' },
  { key: 'pending',   label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đang xử lý' },
  { key: 'shipping',  label: 'Đang giao' },
  { key: 'completed', label: 'Đã giao' },
  { key: 'cancelled', label: 'Đã hủy' },
]

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod:           'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
  momo:          'Ví MoMo',
  vnpay:         'VNPay',
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Badge trạng thái ─────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const { Icon, label, color, bg, border } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${bg} ${color} ${border}`}>
      <Icon size={14} />
      {label}
    </span>
  )
}

// ─── Stepper tiến trình đơn hàng ─────────────────────────
const STEPS = [
  { key: 'pending',   label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'shipping',  label: 'Đang giao' },
  { key: 'completed', label: 'Đã giao' },
]

function OrderStepper({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') return null
  const currentIdx = STEPS.findIndex(s => s.key === status)
  return (
    <div className="flex items-center gap-0 w-full my-4">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                done ? 'bg-[#1a73e8] text-white' : 'bg-gray-200 text-gray-400'
              } ${active ? 'ring-4 ring-[#1a73e8]/20' : ''}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs text-center leading-tight ${done ? 'text-[#1a73e8] font-medium' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mb-5 -mx-1 transition ${i < currentIdx ? 'bg-[#1a73e8]' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Chi tiết đơn hàng (expandable) ──────────────────────
function OrderDetail({ order }: { order: OrderRow }) {
  const shippingFee = order.shippingFee || 0
  const discount = order.discount || 0
  const total = order.totalAmount || 0
  const final = order.finalAmount || (total + shippingFee - discount)

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-4">
      {/* Stepper */}
      <OrderStepper status={order.status} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {/* Thông tin giao hàng */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
            <MapPin size={14} /> Thông tin nhận hàng
          </h4>
          <div className="text-sm text-gray-600 space-y-1 pl-5">
            <p className="flex items-center gap-1.5">
              <User size={12} className="text-gray-400" />
              <strong>{order.customerFullName ?? order.customerInfo?.fullName}</strong>
            </p>
            <p className="flex items-center gap-1.5">
              <Phone size={12} className="text-gray-400" />
              {order.customerPhone ?? order.customerInfo?.phone}
            </p>
            <p className="text-gray-500">{order.customerAddress ?? order.customerInfo?.address}</p>
          </div>
        </div>

        {/* Thanh toán */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
            <CreditCard size={14} /> Thanh toán
          </h4>
          <div className="text-sm text-gray-600 pl-5 space-y-1">
            <p>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</p>
            <p className={`font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
              {order.paymentStatus === 'paid' ? '✓ Đã thanh toán' : 'Chưa thanh toán'}
            </p>
          </div>
        </div>
      </div>

      {/* Sản phẩm */}
      <div className="mt-4 space-y-2">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
            <img
              src={item.image || '/placeholder.png'}
              alt={item.name ?? undefined}
              className="w-14 h-14 object-contain bg-gray-50 rounded shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">x{item.quantity}</p>
            </div>
            <p className="font-bold text-[#ff6b00] text-sm shrink-0">
              {formatPrice((item.price ?? 0) * (item.quantity ?? 0))}
            </p>
          </div>
        ))}
      </div>

      {/* Tổng cộng */}
      <div className="mt-4 bg-white rounded-lg border border-gray-100 p-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Tạm tính</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Phí vận chuyển</span>
          <span className={shippingFee === 0 ? 'text-green-600' : ''}>
            {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span className="flex items-center gap-1"><Tag size={12} /> Giảm giá</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Tổng cộng</span>
          <span className="text-[#ff6b00]">{formatPrice(final)}</span>
        </div>
      </div>

      {order.note && (
        <p className="mt-3 text-sm text-gray-500 italic">📝 Ghi chú: {order.note}</p>
      )}
    </div>
  )
}

// ─── Hộp thoại xác nhận huỷ đơn ───────────────────────────
const CANCEL_REASONS = [
  'Tôi muốn thay đổi sản phẩm / số lượng',
  'Tôi muốn thay đổi địa chỉ hoặc thông tin nhận hàng',
  'Đặt nhầm / không còn nhu cầu mua',
  'Tìm được nơi bán giá tốt hơn',
  'Lý do khác',
]

type CancelDialogProps = {
  order: OrderRow
  submitting: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

function CancelDialog({ order, submitting, onConfirm, onClose }: CancelDialogProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={submitting ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <XCircle size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">Huỷ đơn hàng {order.orderCode}?</h3>
            <p className="text-sm text-gray-500 mt-0.5">Thao tác này không thể hoàn tác. Sản phẩm sẽ được trả lại kho.</p>
          </div>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-2">Lý do huỷ đơn</p>
        <div className="space-y-2 mb-5">
          {CANCEL_REASONS.map((r) => (
            <label key={r} className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer text-sm transition ${reason === r ? 'border-[#1a73e8] bg-[#1a73e8]/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[#1a73e8]" />
              {r}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60">
            Không huỷ
          </button>
          <button onClick={() => onConfirm(reason)} disabled={submitting}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Đang huỷ...</> : 'Xác nhận huỷ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card đơn hàng ────────────────────────────────────────
function OrderCard({ order, onUpdated }: { order: OrderRow; onUpdated: (o: OrderRow) => void }) {
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [paying, setPaying] = useState(false)

  const isUnpaid = order.paymentStatus !== 'paid'
  // Chỉ huỷ đơn đang pending và chưa thanh toán; guest phải có capability token để xác thực.
  const canCancel = order.status === 'pending' && isUnpaid && !!order.userId
  const canCancelGuest = order.status === 'pending' && isUnpaid && !order.userId && Boolean(order.guestAccessToken)
  const guestPending = order.status === 'pending' && isUnpaid && !order.userId && !order.guestAccessToken
  const canPayAgain =
    order.status === 'pending' && isUnpaid && (!order.userId ? Boolean(order.guestAccessToken) : true) &&
    (order.paymentMethod === 'momo' || order.paymentMethod === 'vnpay' || order.paymentMethod === 'bank_transfer')

  const handleCancel = async (reason: string) => {
    setCancelling(true)
    try {
      const endpoint = order.userId
        ? `/orders/${order._id || order.id}/cancel`
        : `/orders/${order._id || order.id}/cancel-guest`
      const res = await api.put<OrderRow>(endpoint, { reason, ...(order.guestAccessToken ? { guestAccessToken: order.guestAccessToken } : {}) })
      onUpdated({ ...order, ...res.data })
      setShowCancel(false)
      toast.success('Đã huỷ đơn hàng ' + order.orderCode)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể huỷ đơn hàng. Vui lòng thử lại.'))
    } finally {
      setCancelling(false)
    }
  }

  const handlePayAgain = async () => {
    setPaying(true)
    try {
      const res = await api.post<{ paymentUrl: string }>('/payment/create', {
        orderId: order.id || order._id,
        method: order.paymentMethod,
        guestAccessToken: order.guestAccessToken,
      })
      window.location.href = res.data.paymentUrl
    } catch (err) {
      toast.error(order.paymentMethod === 'bank_transfer'
        ? 'Vui lòng chuyển khoản theo thông tin ngân hàng đã hiển thị khi đặt hàng.'
        : getErrorMessage(err, 'Không mở được cổng thanh toán. Vui lòng thử lại sau.'))
      setPaying(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-gray-800">{order.orderCode}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 text-sm">{formatDate(order.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </div>

      {/* Preview sản phẩm (collapsed) */}
      {!expanded && (
        <div className="px-4 pb-3">
          {order.items?.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 border-t border-gray-100">
              <img
                src={item.image || '/placeholder.png'}
                alt={item.name ?? undefined}
                className="w-12 h-12 object-contain bg-gray-50 rounded shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                <p className="text-xs text-gray-400">x{item.quantity}</p>
              </div>
              <p className="text-sm font-bold text-[#ff6b00] shrink-0">
                {formatPrice((item.price ?? 0) * (item.quantity ?? 0))}
              </p>
            </div>
          ))}
          {(order.items?.length || 0) > 2 && (
            <p className="text-xs text-gray-400 pt-1">+{order.items.length - 2} sản phẩm khác</p>
          )}
        </div>
      )}

      {/* Footer (collapsed) */}
      {!expanded && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-gray-500 text-sm">Tổng tiền:</span>
          <span className="font-bold text-lg">
            {formatPrice(order.finalAmount || order.totalAmount)}
          </span>
        </div>
      )}

      {/* Chi tiết (expanded) */}
      {expanded && <OrderDetail order={order} />}

      {/* Hành động của khách */}
      {(canCancel || canCancelGuest || canPayAgain || guestPending) && (
        <div className="border-t border-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
          <p className="text-xs text-gray-400">
            {guestPending
              ? 'Đơn đặt khi chưa đăng nhập — vui lòng liên hệ cửa hàng nếu muốn huỷ.'
              : canCancelGuest
                ? 'Bạn có thể tự huỷ đơn khách vãng lai khi đơn chưa được xác nhận.'
                : canPayAgain
                ? 'Đơn chưa được thanh toán.'
                : 'Bạn có thể huỷ đơn khi cửa hàng chưa xác nhận.'}
          </p>
          <div className="flex gap-2">
            {canPayAgain && (
              <button onClick={handlePayAgain} disabled={paying}
                className="px-4 py-2 bg-[#ff6b00] text-white rounded-lg text-sm font-bold hover:bg-[#e55d00] transition disabled:opacity-60">
                {paying ? 'Đang kết nối...' : order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Thanh toán lại'}
              </button>
            )}
            {(canCancel || canCancelGuest) && (
              <button onClick={() => setShowCancel(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition">
                Huỷ đơn hàng
              </button>
            )}
          </div>
        </div>
      )}

      {showCancel && (
        <CancelDialog order={order} submitting={cancelling} onConfirm={handleCancel} onClose={() => setShowCancel(false)} />
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────
function OrdersPage() {
  useSEO({ title: 'Đơn hàng của tôi', url: '/orders' })
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')

  const loadOrders = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)

    // 1. Đọc đơn hàng từ localStorage (guest + đã login đều có)
    let localOrders: OrderRow[] = []
    try {
      localOrders = JSON.parse(localStorage.getItem('cuahangmaytinh_orders') || '[]') as OrderRow[]
    } catch {}

    // Làm mới trạng thái đơn guest còn pending bằng capability token; token không được gửi qua URL.
    const guestOrdersToRefresh = localOrders.filter((order) =>
      !order.userId && order.status === 'pending' && Boolean(order.guestAccessToken) && Boolean(order.id || order._id)
    )
    if (guestOrdersToRefresh.length > 0) {
      try {
        const response = await api.post<OrderRow[]>('/orders/guest/status', {
          orders: guestOrdersToRefresh.map((order) => ({
            orderId: order._id || order.id,
            guestAccessToken: order.guestAccessToken,
          })),
        })
        const refreshedByCode = new Map(response.data.map((order) => [order.orderCode, order]))
        localOrders = localOrders.map((order) => refreshedByCode.get(order.orderCode) || order)
        localStorage.setItem('cuahangmaytinh_orders', JSON.stringify(localOrders))
      } catch { /* keep local order data if the status refresh is temporarily unavailable */ }
    }

    // 2. Nếu đã đăng nhập → gọi API lấy thêm
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const res = await api.get<unknown>('/orders/myorders')
        // `orderController.getMyOrders` trả thẳng mảng đơn hàng; nhánh `?.data` là di sản
        // envelope cũ — giữ nguyên thứ tự ưu tiên `data` → body → `[]`.
        const body = res.data as { data?: OrderRow[] } | OrderRow[] | undefined
        const apiOrders: OrderRow[] = (body && !Array.isArray(body) ? body.data : body) ?? []

        // Merge: ưu tiên API (dữ liệu mới nhất), bỏ trùng theo orderCode
        const codeSet = new Set(apiOrders.map(o => o.orderCode))
        const uniqueLocal = localOrders.filter(o => !codeSet.has(o.orderCode))
        const merged = [...apiOrders, ...uniqueLocal]
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setOrders(merged)
      } catch {
        // Nếu API lỗi thì vẫn dùng localStorage
        localOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setOrders(localOrders)
        if (localOrders.length === 0) {
          setError('Không thể tải đơn hàng. Vui lòng thử lại.')
        }
      }
    } else {
      // Chưa đăng nhập → chỉ dùng localStorage
      localOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setOrders(localOrders)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Lọc theo tab
  const filtered = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab)

  // Đếm badge
  const countByStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Đơn hàng của tôi</h1>
        <button
          onClick={loadOrders}
          className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:text-[#1557b0] transition"
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const count = tab.key === 'all' ? orders.length : (countByStatus[tab.key] || 0)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'bg-white border hover:bg-gray-50 text-gray-600'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 size={40} className="animate-spin mb-3" />
          <p>Đang tải đơn hàng...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadOrders}
            className="px-6 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
          >
            Thử lại
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {activeTab === 'all' ? 'Chưa có đơn hàng nào' : `Không có đơn hàng "${TABS.find(t => t.key === activeTab)?.label}"`}
          </p>
          {activeTab === 'all' && (
            <>
              <p className="text-gray-400 text-sm mb-6">Hãy đặt mua sản phẩm đầu tiên của bạn!</p>
              <Link
                to="/"
                className="inline-block px-6 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
              >
                Mua sắm ngay
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => (
            <OrderCard
              key={order._id || order.orderCode}
              order={order}
              onUpdated={(updated) => {
                setOrders(prev => prev.map(o => (o.orderCode === updated.orderCode ? updated : o)))
                try {
                  const saved = JSON.parse(localStorage.getItem('cuahangmaytinh_orders') || '[]') as OrderRow[]
                  localStorage.setItem('cuahangmaytinh_orders', JSON.stringify(saved.map(o => o.orderCode === updated.orderCode ? updated : o)))
                } catch { /* ignore storage failures; current UI state is still updated */ }
              }}
            />
          ))}
          <p className="text-center text-xs text-gray-400 py-2">
            Hiển thị {filtered.length} đơn hàng
          </p>
        </div>
      )}
    </div>
  )
}

export default OrdersPage
