import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Eye, Truck, CheckCircle, XCircle, Clock, Package,
  MapPin, Phone, Mail, CreditCard, RefreshCw, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Tag, User, Info, Zap, ExternalLink,
  ArrowRight, History
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import { useToast } from '../../components/Toast'
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../types'

// ─── Kiểu dữ liệu dùng riêng cho trang admin đơn hàng ──────
/** Trạng thái webhook vận chuyển — nằm ngoài OrderStatus/PaymentStatus/PaymentMethod nên định nghĩa union cục bộ. */
type TrackingStatus = 'picked_up' | 'in_transit' | 'delivered' | 'failed'
type SimTrackingStatus = Extract<TrackingStatus, 'in_transit' | 'delivered' | 'failed'>
type StatusFilter = OrderStatus | 'all'

/**
 * Dòng `/admin/orders` trả về cho trang này (Prisma Order phẳng + `_id` shim). UI bản JS cũ vẫn đọc
 * theo shape MongoDB (`customerInfo`, `items`, `shippingInfo`, `statusHistory`) — khai báo optional
 * đúng chỗ UI đọc; runtime giữ nguyên như trước, chỉ phục vụ biên dịch.
 */
type AdminOrderItem = {
  id?: string
  name?: string
  image?: string | null
  variant?: string | null
  price?: number | null
  quantity?: number | null
}

type TrackingHistoryEntry = {
  id?: string
  status: TrackingStatus
  statusLabel?: string
  location?: string | null
  note?: string | null
  recordedAt?: string | null
  source?: string | null
}

type OrderStatusHistoryEntry = {
  id?: string
  status: OrderStatus
  note?: string | null
  changedBy?: string
  changedAt?: string | null
}

type OrderShippingInfo = {
  provider?: string
  providerLabel?: string | null
  trackingCode?: string | null
  webhookToken?: string | null
  deliveredAt?: string | null
  failedAt?: string | null
  trackingHistory?: TrackingHistoryEntry[]
}

type AdminOrderRow = {
  id?: string
  _id: string
  orderCode: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  customerInfo?: { fullName?: string; phone?: string; email?: string; address?: string }
  items?: AdminOrderItem[]
  /** 'member' = đặt khi đã đăng nhập, 'guest' = khách vãng lai (backend gắn từ userId). */
  customerType?: 'member' | 'guest'
  userInfo?: { fullName?: string; email?: string } | null
  totalAmount: number
  shippingFee?: number
  discount?: number
  finalAmount?: number
  note?: string | null
  createdAt: string
  shippingInfo?: OrderShippingInfo | null
  statusHistory?: OrderStatusHistoryEntry[]
}

type AdminOrdersResponse = {
  orders?: AdminOrderRow[]
  total?: number
  totalPages?: number
  currentPage?: number
}

/** Body `PUT /admin/orders/:id/status` — giữ đúng tên field backend mong đợi (`UpdateOrderStatusInput`). */
type ShippingHandoffPayload = { provider: string; trackingCode: string; note: string }
type UpdateStatusExtraBody = {
  shippingInfo?: { provider: string; trackingCode: string }
  note?: string
}

// ─── Config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: LucideIcon }> = {
  pending:   { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700',  icon: Clock },
  confirmed: { label: 'Đang xử lý',   color: 'bg-blue-100 text-blue-700',      icon: Package },
  shipping:  { label: 'Đang giao',    color: 'bg-indigo-100 text-indigo-700',  icon: Truck },
  completed: { label: 'Đã giao',      color: 'bg-green-100 text-green-700',    icon: CheckCircle },
  cancelled: { label: 'Đã hủy',       color: 'bg-red-100 text-red-700',        icon: XCircle },
}

/** Thay cho phép tra `STATUS_CONFIG[s]`Truthy của bản JS — narrow string về OrderStatus. */
const isOrderStatus = (value: string): value is OrderStatus =>
  Object.prototype.hasOwnProperty.call(STATUS_CONFIG, value)

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: 'COD (nhận hàng)', bank_transfer: 'Chuyển khoản', momo: 'Ví MoMo', vnpay: 'VNPay',
}

type ShippingProvider = { value: string; label: string; trackingUrl: string | null }

const SHIPPING_PROVIDERS: ShippingProvider[] = [
  { value: 'ghn',          label: 'Giao Hàng Nhanh (GHN)',       trackingUrl: 'https://ghn.vn/pages/result/?trackingCode=' },
  { value: 'ghtk',         label: 'Giao Hàng Tiết Kiệm (GHTK)',  trackingUrl: 'https://i.ghtk.vn/' },
  { value: 'viettelpost',  label: 'Viettel Post',                 trackingUrl: 'https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/' },
  { value: 'manual',       label: 'Tự giao / Khác',              trackingUrl: null },
]

const TRACKING_STATUS_LABELS: Record<TrackingStatus, { label: string; color: string }> = {
  picked_up:  { label: 'Đã lấy hàng',       color: 'bg-blue-100 text-blue-600' },
  in_transit: { label: 'Đang trên đường',    color: 'bg-indigo-100 text-indigo-600' },
  delivered:  { label: 'Đã giao thành công', color: 'bg-green-100 text-green-600' },
  failed:     { label: 'Giao thất bại',      color: 'bg-red-100 text-red-600' },
}

const formatDate = (d: string | null | undefined): string => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatPrice = (n: number | null | undefined): string => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

// ─── Badge ─────────────────────────────────────────────────
/** Nhãn phân biệt thành viên đã đăng ký và khách vãng lai. */
function CustomerTypeBadge({ type }: { type?: 'member' | 'guest' }) {
  if (!type) return null
  return type === 'member' ? (
    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
      Thành viên
    </span>
  ) : (
    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
      Khách vãng lai
    </span>
  )
}

type StatusBadgeProps = { status: OrderStatus }

function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

// ─── Modal nhập thông tin vận chuyển ────────────────────────
type ShippingModalProps = {
  order: AdminOrderRow
  onClose: () => void
  onConfirm: (payload: ShippingHandoffPayload) => Promise<void>
}

function ShippingModal({ order, onClose, onConfirm }: ShippingModalProps) {
  const [provider, setProvider] = useState<string>('ghn')
  const [trackingCode, setTrackingCode] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = async (): Promise<void> => {
    setLoading(true)
    try {
      await onConfirm({ provider, trackingCode: trackingCode.trim(), note })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Truck size={18} className="text-indigo-500" />
            Bàn giao vận chuyển
          </h3>
          <p className="text-sm text-gray-500 mt-1">Đơn hàng #{order.orderCode}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Hướng dẫn */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              Sau khi bàn giao, đơn vị vận chuyển sẽ tự động cập nhật trạng thái qua <strong>webhook</strong>.
              Khi họ xác nhận giao thành công, đơn hàng sẽ tự chuyển sang "Đã giao" mà không cần admin làm gì.
            </span>
          </div>

          {/* Chọn đơn vị vận chuyển */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Đơn vị vận chuyển <span className="text-red-500">*</span>
            </label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            >
              {SHIPPING_PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Mã vận đơn */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Mã vận đơn {provider !== 'manual' && <span className="text-gray-400">(khuyến nghị)</span>}
            </label>
            <input
              type="text"
              placeholder={provider === 'manual' ? 'Không bắt buộc' : 'VD: GHN123456789'}
              value={trackingCode}
              onChange={e => setTrackingCode(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            />
            {provider !== 'manual' && (
              <p className="text-xs text-gray-400 mt-1">
                Lấy mã từ dashboard của {SHIPPING_PROVIDERS.find(p => p.value === provider)?.label}
              </p>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Ghi chú</label>
            <input
              type="text"
              placeholder="VD: Giao trong giờ hành chính"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Webhook URL info */}
          <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">📡 Cấu hình webhook URL trên dashboard vận chuyển:</p>
            <code className="text-indigo-600 break-all">
              {window.location.origin.replace('3000', '5000')}/api/webhook/shipping
            </code>
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Hủy</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
            Xác nhận bàn giao
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tracking history timeline ──────────────────────────────
type TrackingTimelineProps = { history?: TrackingHistoryEntry[] | null }

function TrackingTimeline({ history }: TrackingTimelineProps) {
  if (!history || history.length === 0) return null
  return (
    <div className="space-y-2">
      {[...history].reverse().map((h, i) => {
        const cfg = TRACKING_STATUS_LABELS[h.status] || { label: h.status, color: 'bg-gray-100 text-gray-600' }
        return (
          <div key={i} className={`flex gap-3 p-2.5 rounded-lg ${i === 0 ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-2 h-2 rounded-full mt-1 ${i === 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
              {i < history.length - 1 && <div className="w-px h-4 bg-gray-200" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-gray-400">{formatDate(h.recordedAt)}</span>
                {h.source === 'webhook' && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">webhook</span>
                )}
              </div>
              {h.location && <p className="text-xs text-gray-500 mt-0.5">📍 {h.location}</p>}
              {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Modal chi tiết đơn hàng ────────────────────────────────
type OrderModalProps = {
  order: AdminOrderRow
  onClose: () => void
  onStatusChange: (orderId: string, newStatus: OrderStatus, updatedOrder?: AdminOrderRow | null) => void
}

function OrderModal({ order: initialOrder, onClose, onStatusChange }: OrderModalProps) {
  // Bản JS gốc gọi `toast` trong OrderModal nhưng không khai báo — bắt buộc phải lấy từ useToast để strict TS biên dịch được.
  const toast = useToast()
  const [order, setOrder] = useState<AdminOrderRow>(initialOrder)
  const [updating, setUpdating] = useState<boolean>(false)
  const [showShippingModal, setShowShippingModal] = useState<boolean>(false)
  const [simulating, setSimulating] = useState<boolean>(false)
  const [simStatus, setSimStatus] = useState<SimTrackingStatus>('in_transit')

  // Sync order khi prop thay đổi
  useEffect(() => { setOrder(initialOrder) }, [initialOrder])

  const updateStatus = async (status: OrderStatus, extraBody: UpdateStatusExtraBody = {}): Promise<void> => {
    setUpdating(true)
    try {
      const res = await api.put(`/admin/orders/${order._id}/status`, { status, ...extraBody })
      const updated = res.data as AdminOrderRow // ép kiểu tại biên fetch (endpoint admin không khớp Order chung)
      setOrder(updated)
      onStatusChange(order._id, updated.status, updated)
    } catch (err) {
      toast.error('Cập nhật thất bại: ' + getErrorMessage(err))
    } finally {
      setUpdating(false)
    }
  }

  // Bàn giao vận chuyển: status → shipping + shippingInfo
  const handleHandoff = async ({ provider, trackingCode, note }: ShippingHandoffPayload): Promise<void> => {
    await updateStatus('shipping', { shippingInfo: { provider, trackingCode }, note })
  }

  // Giả lập webhook từ đơn vị vận chuyển (chỉ để dev/test)
  const handleSimulate = async (): Promise<void> => {
    const webhookToken = order.shippingInfo?.webhookToken
    if (!webhookToken) return
    setSimulating(true)
    try {
      const statusLabels: Record<SimTrackingStatus, string> = {
        in_transit: 'Đang trên đường giao',
        delivered:  'Giao hàng thành công',
        failed:     'Không giao được hàng',
      }
      const res = await api.post('/admin/orders/simulate-webhook', {
        webhookToken,
        trackingStatus: simStatus,
        statusLabel: statusLabels[simStatus],
        location: simStatus === 'delivered' ? 'Nhà khách hàng' : 'Bưu cục trung chuyển',
        note: `Giả lập bởi admin [${new Date().toLocaleTimeString('vi-VN')}]`,
      })
      const result = res.data as { success?: boolean } // ép kiểu tại biên fetch
      if (result.success) {
        // Tải lại đúng đơn qua API danh sách có hỗ trợ tìm kiếm server-side.
        const listRes = await api.get('/admin/orders', {
          params: { page: 1, limit: 10, search: order.orderCode },
        })
        const listData = listRes.data as AdminOrdersResponse // ép kiểu tại biên fetch
        const found = listData.orders?.find((o) => o._id === order._id)
        if (found) {
          setOrder(found)
          onStatusChange(order._id, found.status, found)
        }
      }
    } catch (err) {
      toast.error('Giả lập thất bại: ' + getErrorMessage(err))
    } finally {
      setSimulating(false)
    }
  }

  const si = order.shippingInfo
  const provider = SHIPPING_PROVIDERS.find(p => p.value === si?.provider)
  const shippingFee = order.shippingFee || 0
  const discount = order.discount || 0

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto cursor-default" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
            <div>
              <h3 className="font-bold text-lg">Đơn hàng #{order.orderCode}</h3>
              <p className="text-sm text-gray-400">{formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <XCircle size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Thông tin khách */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5 mb-3">
                <User size={14} /> Thông tin khách hàng
                <CustomerTypeBadge type={order.customerType} />
              </h4>
              {order.customerType === 'member' && order.userInfo && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  Tài khoản đã đăng ký: <strong>{order.userInfo.fullName}</strong> ({order.userInfo.email})
                </p>
              )}
              {order.customerType === 'guest' && (
                <p className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
                  Khách đặt hàng không đăng nhập — chỉ liên hệ được qua thông tin bên dưới.
                </p>
              )}
              <p className="text-sm flex items-center gap-2"><User size={13} className="text-gray-400" /><span className="font-medium">{order.customerInfo?.fullName}</span></p>
              <p className="text-sm flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400" />{order.customerInfo?.phone}</p>
              {order.customerInfo?.email && <p className="text-sm flex items-center gap-2 text-gray-600"><Mail size={13} className="text-gray-400" />{order.customerInfo.email}</p>}
              <p className="text-sm flex items-center gap-2 text-gray-600"><MapPin size={13} className="text-gray-400" />{order.customerInfo?.address}</p>
            </div>

            {/* Thanh toán */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5 mb-3"><CreditCard size={14} /> Thanh toán</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
                <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                  {order.paymentStatus === 'paid' ? '✓ Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>
            </div>

            {/* ── THÔNG TIN VẬN CHUYỂN (hiện khi đã bàn giao) ── */}
            {si && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-sm text-indigo-700 flex items-center gap-1.5">
                  <Truck size={14} /> Thông tin vận chuyển
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Đơn vị</p>
                    <p className="font-medium">{si.providerLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Mã vận đơn</p>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-medium text-indigo-700">{si.trackingCode || '—'}</span>
                      {si.trackingCode && provider?.trackingUrl && (
                        <a href={provider.trackingUrl + si.trackingCode} target="_blank" rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-600">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                  {si.deliveredAt && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-0.5">Thời gian giao</p>
                      <p className="font-medium text-green-700">{formatDate(si.deliveredAt)}</p>
                    </div>
                  )}
                </div>

                {/* Tracking history */}
                {si.trackingHistory && si.trackingHistory.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <History size={11} /> Lịch sử vận chuyển
                    </p>
                    <TrackingTimeline history={si.trackingHistory} />
                  </div>
                )}

                {/* Webhook info + Simulator */}
                {order.status === 'shipping' && (
                  <div className="border-t border-indigo-200 pt-3 mt-1">
                    <div className="bg-white rounded-lg p-3 space-y-3 border border-dashed border-indigo-200">
                      <div className="flex items-start gap-2">
                        <Zap size={13} className="text-purple-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-gray-600">
                          <p className="font-semibold text-gray-800 mb-0.5">Tự động hoàn thành qua Webhook</p>
                          <p>Khi đơn vị vận chuyển giao xong, họ sẽ POST về:</p>
                          <code className="text-indigo-600 block mt-0.5 break-all">
                            {window.location.origin.replace('3000', '5000')}/api/webhook/shipping
                          </code>
                          <p className="mt-1">Đơn hàng sẽ tự động chuyển sang <strong>"Đã giao"</strong> mà không cần admin bấm.</p>
                        </div>
                      </div>

                      {/* DEV: Giả lập webhook */}
                      <div className="border-t pt-2.5">
                        <p className="text-xs font-semibold text-orange-600 mb-2">🧪 Dev — Giả lập cập nhật từ đơn vị vận chuyển:</p>
                        <div className="flex items-center gap-2">
                          <select
                            value={simStatus}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v === 'in_transit' || v === 'delivered' || v === 'failed') setSimStatus(v)
                            }}
                            className="text-xs border rounded-lg px-2 py-1.5 flex-1 focus:outline-none"
                          >
                            <option value="in_transit">Đang trên đường</option>
                            <option value="delivered">Giao thành công ✓</option>
                            <option value="failed">Giao thất bại ✗</option>
                          </select>
                          <button
                            onClick={handleSimulate}
                            disabled={simulating}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 disabled:opacity-60 whitespace-nowrap"
                          >
                            {simulating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            Gửi webhook
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sản phẩm */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Sản phẩm ({order.items?.length || 0})</h4>
              <div className="space-y-3">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-16 h-16 shrink-0 bg-white rounded-lg border border-gray-100 overflow-hidden">
                      <img src={item.image || '/placeholder.png'} alt={item.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' fill='none'%3E%3Crect width='64' height='64' rx='8' fill='%23f3f4f6'/%3E%3Cpath d='M20 44l8-12 6 8 4-6 6 10H20z' fill='%23d1d5db'/%3E%3C/svg%3E" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                      {item.variant && <p className="text-xs text-gray-400 mt-0.5">Loại: {item.variant}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.price)} × {item.quantity}</p>
                    </div>
                    <p className="font-bold text-[#ff6b00] text-sm shrink-0">{formatPrice((item.price ?? 0) * (item.quantity ?? 0))}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tổng tiền */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Tạm tính</span><span>{formatPrice(order.totalAmount)}</span></div>
              <div className="flex justify-between text-gray-500">
                <span>Phí vận chuyển</span>
                <span className={shippingFee === 0 ? 'text-green-600' : ''}>{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1"><Tag size={12} /> Giảm giá</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                <span>Tổng cộng</span>
                <span className="text-[#ff6b00]">{formatPrice(order.finalAmount || order.totalAmount)}</span>
              </div>
            </div>

            {order.note && (
              <p className="text-sm text-gray-500 italic bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-2">
                📝 Ghi chú: {order.note}
              </p>
            )}

            {/* ── Hành động cập nhật trạng thái ── */}
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Xử lý đơn hàng</p>

              {/* Giải thích quy trình */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 flex-wrap">
                {['Chờ xác nhận', 'Xác nhận đơn', 'Bàn giao vận chuyển', 'Giao thành công (webhook)'].map((s, i, arr) => (
                  <React.Fragment key={i}>
                    <span className={`px-2 py-0.5 rounded ${i < arr.length - 1 ? 'bg-gray-100' : 'bg-green-100 text-green-700'}`}>{s}</span>
                    {i < arr.length - 1 && <ArrowRight size={11} className="text-gray-300" />}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* pending → confirmed */}
                {order.status === 'pending' && (
                  <button disabled={updating} onClick={() => updateStatus('confirmed')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-60 text-sm">
                    <Package size={14} /> Xác nhận đơn hàng
                  </button>
                )}

                {/* confirmed → shipping (mở modal nhập thông tin vận chuyển) */}
                {order.status === 'confirmed' && (
                  <button disabled={updating} onClick={() => setShowShippingModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-60 text-sm">
                    <Truck size={14} /> Bàn giao vận chuyển
                  </button>
                )}

                {/* shipping → completed: tự giao HOẶC đơn cũ không có webhookToken */}
                {order.status === 'shipping' && (si?.provider === 'manual' || !si?.webhookToken) && (
                  <button disabled={updating} onClick={() => updateStatus('completed', { note: 'Xác nhận thủ công bởi admin' })}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-60 text-sm">
                    <CheckCircle size={14} /> Xác nhận đã giao (thủ công)
                  </button>
                )}
               {order.status === 'shipping' && si?.webhookToken && si?.provider !== 'manual' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                    <Zap size={13} className="text-purple-500" />
                    Chờ webhook từ {si?.providerLabel} — sẽ tự động cập nhật
                  </div>
                )}

                {/* Hủy đơn */}
                {(order.status === 'pending' || order.status === 'confirmed') && (
                  <button disabled={updating}
                    onClick={() => { if (confirm('Hủy đơn hàng này?')) updateStatus('cancelled') }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-red-400 text-red-500 rounded-lg hover:bg-red-50 transition disabled:opacity-60 text-sm">
                    <XCircle size={14} /> Hủy đơn hàng
                  </button>
                )}

                {(order.status === 'completed' || order.status === 'cancelled') && (
                  <p className="text-sm text-gray-400 italic py-2">
                    Đơn hàng đã {order.status === 'completed' ? 'hoàn thành' : 'bị hủy'} — không thể thay đổi trạng thái.
                  </p>
                )}

                {updating && <Loader2 size={18} className="animate-spin text-gray-400 self-center" />}
              </div>
            </div>

            {/* Lịch sử trạng thái đơn hàng */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide flex items-center gap-1">
                  <History size={11} /> Lịch sử đơn hàng
                </p>
                <div className="space-y-2">
                  {[...order.statusHistory].reverse().map((h, i) => {
                    const cfg = STATUS_CONFIG[h.status]
                    return (
                      <div key={i} className="flex items-start gap-3 text-xs text-gray-500">
                        <span className={`mt-0.5 px-2 py-0.5 rounded-full font-medium ${cfg?.color || 'bg-gray-100'}`}>
                          {cfg?.label || h.status}
                        </span>
                        <div>
                          <span className="text-gray-400">{formatDate(h.changedAt)}</span>
                          {h.note && <span className="ml-2 text-gray-500">— {h.note}</span>}
                          <span className="ml-2 text-gray-300">({h.changedBy})</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showShippingModal && (
        <ShippingModal
          order={order}
          onClose={() => setShowShippingModal(false)}
          onConfirm={handleHandoff}
        />
      )}
    </>
  )
}

// ─── Main AdminOrders ──────────────────────────────────────
function AdminOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>(() => new URLSearchParams(window.location.search).get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState<string>(() => new URLSearchParams(window.location.search).get('search') || '')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRow | null>(null)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const loadOrders = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit: 20, ...(statusFilter !== 'all' && { status: statusFilter }), ...(debouncedSearch && { search: debouncedSearch }) }
      const res = await api.get('/admin/orders', { params })
      const data = res.data as AdminOrdersResponse // ép kiểu tại biên fetch (hàng đợi admin không khớp Order chung)
      setOrders(data.orders || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      setError('Không thể tải danh sách đơn hàng. ' + getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const searchParam = params.get('search')
    const s = params.get('status')
    if (searchParam !== null) setSearchQuery(searchParam)
    if (s && isOrderStatus(s)) setStatusFilter(s)
    else if (!s) setStatusFilter('all')
  }, [location.search])

  // Notification deep-link: tìm server-side trước rồi tự mở đúng đơn một lần.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const orderParam = params.get('order')
    if (!orderParam || loading) return
    const found = orders.find((order) => order._id === orderParam || order.orderCode === orderParam)
    if (!found) return
    setSelectedOrder(found)
    params.delete('order')
    const query = params.toString()
    navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true })
  }, [orders, loading, location.pathname, location.search, navigate])

  const handleStatusChange = (orderId: string, newStatus: OrderStatus, updatedOrder?: AdminOrderRow | null): void => {
    setOrders((prev) => prev.map((o) => (o._id === orderId ? (updatedOrder || { ...o, status: newStatus }) : o)))
    if (selectedOrder?._id === orderId) {
      // `prev` chắc chắn khác null vì lệnh mở modal đang trỏ đúng đơn này — guard để giữ strict TS
      setSelectedOrder(updatedOrder || ((prev) => (prev ? { ...prev, status: newStatus } : prev)))
    }
  }

  const quickAction = async (orderId: string, status: OrderStatus): Promise<void> => {
    try {
      const res = await api.put(`/admin/orders/${orderId}/status`, { status })
      const updated = res.data as AdminOrderRow // ép kiểu tại biên fetch
      handleStatusChange(orderId, updated.status, updated)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const filtered = orders // Bộ lọc tìm kiếm đã chạy phía server trên toàn bộ đơn hàng, không chỉ 20 dòng hiện tại.

  const countByStatus = orders.reduce<Partial<Record<OrderStatus, number>>>((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {})
  const stats = [
    { label: 'Tổng đơn (trang)', value: orders.length, color: 'bg-gray-500' },
    { label: 'Chờ xác nhận', value: countByStatus.pending || 0, color: 'bg-yellow-500' },
    { label: 'Đang xử lý', value: countByStatus.confirmed || 0, color: 'bg-blue-500' },
    { label: 'Đang giao', value: countByStatus.shipping || 0, color: 'bg-indigo-500' },
    { label: 'Đã giao', value: countByStatus.completed || 0, color: 'bg-green-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm mã, tên, SĐT..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8] w-56 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(isOrderStatus(e.target.value) ? e.target.value : 'all'); setPage(1) }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8] text-sm">
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <button onClick={loadOrders} className="flex items-center gap-1.5 text-sm text-[#1a73e8] hover:text-[#1557b0]">
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className={`w-2 h-2 rounded-full ${s.color} mb-2`} />
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 size={36} className="animate-spin mb-3" />
            <p>Đang tải đơn hàng...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left py-3 px-4">Mã đơn</th>
                  <th className="text-left py-3 px-4">Khách hàng</th>
                  <th className="text-left py-3 px-4">Sản phẩm</th>
                  <th className="text-right py-3 px-4">Tổng tiền</th>
                  <th className="text-center py-3 px-4">Ngày đặt</th>
                  <th className="text-center py-3 px-4">Trạng thái</th>
                  <th className="text-center py-3 px-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-400">
                    <Package size={40} className="mx-auto mb-3 text-gray-300" />Không có đơn hàng nào
                  </td></tr>
                )}
                {filtered.map(order => {
                  const firstItem = order.items?.[0]
                  return (
                    <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-medium text-sm">{order.orderCode}</span>
                        {order.shippingInfo?.trackingCode && (
                          <p className="text-xs text-indigo-500 mt-0.5 font-mono">{order.shippingInfo.trackingCode}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-sm">{order.customerInfo?.fullName}</p>
                        <p className="text-xs text-gray-400">{order.customerInfo?.phone}</p>
                        <CustomerTypeBadge type={order.customerType} />
                      </td>
                      <td className="py-3 px-4">
                        {firstItem ? (
                          <div className="flex items-center gap-2">
                            <img src={firstItem.image || ''} alt={firstItem.name}
                              className="w-10 h-10 object-contain bg-gray-100 rounded-lg border shrink-0"
                              onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Crect width='40' height='40' rx='6' fill='%23f3f4f6'/%3E%3C/svg%3E" }} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium line-clamp-1">{firstItem.name}</p>
                              {(order.items?.length || 0) > 1 && <p className="text-xs text-gray-400">+{(order.items?.length ?? 0) - 1} khác</p>}
                            </div>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sm">{formatPrice(order.finalAmount || order.totalAmount)}</td>
                      <td className="py-3 px-4 text-center text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="py-3 px-4 text-center"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-gray-400 hover:text-[#1a73e8] hover:bg-blue-50 rounded transition" title="Chi tiết & xử lý">
                            <Eye size={16} />
                          </button>
                          {order.status === 'pending' && (
                            <button onClick={() => quickAction(order._id, 'confirmed')}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition" title="Xác nhận đơn">
                              <Package size={16} />
                            </button>
                          )}
                          {/* confirmed → shipping cần modal, nên dùng Eye để mở chi tiết */}
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <button onClick={() => { if (confirm('Hủy đơn hàng này?')) quickAction(order._id, 'cancelled') }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="Hủy đơn">
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Tổng {total} đơn hàng</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={16} /></button>
              <span className="text-sm font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

export default AdminOrders
