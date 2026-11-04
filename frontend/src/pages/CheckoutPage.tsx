import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight, Truck, Smartphone, Building2,
  Tag, CheckCircle2, XCircle, ShoppingBag, ArrowLeft, Loader2, Clock, AlertTriangle
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAppSelector } from '../redux/hooks'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { formatPrice } from '../utils/formatPrice'
import api, { getErrorMessage } from '../api/api'
import { useToast } from '../components/Toast'
import type { Order } from '../types'
import LegalModal from '../components/LegalModal'
import type { LegalType } from '../components/LegalModal'

/** Kết quả hợp lệ của `POST /vouchers/validate` — xem `backend/src/services/voucherService.ts`. */
type AppliedVoucher = {
  code: string;
  label: string;
  discountAmount: number;
  freeShip: boolean;
}

/** Lỗi validate từng field của form thanh toán. */
type FormErrors = Partial<Record<'fullName' | 'phone' | 'email' | 'address', string>>

/**
 * Payload gửi lên `POST /orders`. Phí vận chuyển tuyệt đối không được gửi từ frontend;
 * backend tự tính dựa trên cấu hình đã lưu trong PostgreSQL.
 */
type OrderPayload = {
  customerInfo: {
    fullName: string;
    email?: string;
    phone: string;
    address: string;
  };
  items: { productId: string; quantity: number }[];
  voucherCodes?: string[];
  paymentMethod: string;
  note?: string;
}

/**
 * Trạng thái modal kết quả đặt hàng:
 *  - success         : COD — đơn đã tạo xong, chờ cửa hàng xác nhận
 *  - bank_transfer   : đơn đã tạo nhưng CHƯA thanh toán — khách cần chuyển khoản
 *  - payment_failed  : chọn MoMo/VNPay nhưng không mở được cổng thanh toán (đơn đã tạo, chưa thanh toán)
 *  - error           : tạo đơn thất bại
 */
type OrderResult = {
  kind: 'success' | 'bank_transfer' | 'payment_failed' | 'error';
  orderCode?: string;
  errorMsg?: string;
  order?: Order;
  method?: 'momo' | 'vnpay';
}

type SavedAddress = { id: string; _id?: string; name: string; phone: string; address: string; ward?: string | null; district?: string | null; province?: string | null; isDefault: boolean }
type UserProfile = { fullName?: string; email?: string; phone?: string | null }

type PublicVoucher = {
  code: string;
  label: string;
  type: 'percent' | 'flat' | 'freeship';
  value: number;
  minOrder: number;
}

type ResultModalProps = {
  result: OrderResult;
  bankInfo: { bankName: string; bankAccount: string; bankAccountName: string };
  retrying: boolean;
  onClose: () => void;
  onRetry: () => void;
  onRetryPayment: () => void;
  onViewOrders: () => void;
}

const PAYMENT_METHODS = [
  { id: 'cod',           label: 'Thanh toán khi nhận hàng (COD)', desc: 'Trả tiền mặt khi nhận hàng',          Icon: Truck     },
  { id: 'bank_transfer', label: 'Chuyển khoản ngân hàng',         desc: 'Vietcombank / MB Bank / Techcombank',  Icon: Building2 },
  { id: 'momo',          label: 'Ví MoMo',                        desc: 'Thanh toán qua ví điện tử MoMo',      Icon: Smartphone },
  { id: 'vnpay',         label: 'VNPay',                          desc: 'Thẻ ATM, Visa, QR Code qua VNPay',    Icon: Building2 },
]

// ─── Modal kết quả ─────────────────────────────────────────
function ResultModal({ result, bankInfo, retrying, onClose, onRetry, onRetryPayment, onViewOrders }: ResultModalProps) {
  const { kind, orderCode, errorMsg, order, method } = result

  const orderLine = orderCode && (
    <p className="text-gray-500 mb-1">
      Mã đơn hàng: <span className="font-bold text-[#1a73e8]">{orderCode}</span>
    </p>
  )

  const viewOrdersBtn = (
    <button onClick={onViewOrders} className="block w-full py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition">
      Xem đơn hàng của tôi
    </button>
  )
  const continueBtn = (
    <Link to="/" className="block w-full py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
      Tiếp tục mua sắm
    </Link>
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center max-h-[90vh] overflow-y-auto">
        {kind === 'success' && (
          <>
            <CheckCircle2 size={72} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt hàng thành công!</h2>
            {orderLine}
            <p className="text-gray-500 text-sm mb-6">
              Cảm ơn bạn đã mua hàng. Bạn sẽ thanh toán khi nhận hàng. Chúng tôi sẽ liên hệ xác nhận sớm nhất!
            </p>
            <div className="space-y-2">{viewOrdersBtn}{continueBtn}</div>
          </>
        )}

        {kind === 'bank_transfer' && (
          <>
            <Clock size={72} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Đã tạo đơn — chờ chuyển khoản</h2>
            {orderLine}
            <p className="text-gray-500 text-sm mb-4">
              Đơn hàng CHƯA được thanh toán. Vui lòng chuyển khoản theo thông tin dưới đây, cửa hàng sẽ xác nhận đơn sau khi nhận được tiền.
            </p>
            <div className="text-left bg-blue-50 rounded-xl p-4 text-sm space-y-1 mb-6">
              <p><span className="text-gray-500">Ngân hàng:</span> <strong>{bankInfo.bankName}</strong></p>
              <p><span className="text-gray-500">Số tài khoản:</span> <strong>{bankInfo.bankAccount}</strong></p>
              <p><span className="text-gray-500">Chủ tài khoản:</span> <strong>{bankInfo.bankAccountName}</strong></p>
              {order && <p><span className="text-gray-500">Số tiền:</span> <strong className="text-[#ff6b00]">{formatPrice(order.finalAmount)}</strong></p>}
              <p><span className="text-gray-500">Nội dung:</span> <strong>{orderCode}</strong></p>
            </div>
            <div className="space-y-2">{viewOrdersBtn}{continueBtn}</div>
          </>
        )}

        {kind === 'payment_failed' && (
          <>
            <AlertTriangle size={72} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Chưa thể mở cổng thanh toán</h2>
            {orderLine}
            <p className="text-gray-500 text-sm mb-1">
              Đơn hàng đã được tạo nhưng <strong>chưa thanh toán</strong> {method === 'momo' ? 'qua MoMo' : 'qua VNPay'}.
            </p>
            {errorMsg && <p className="text-red-500 text-xs mb-4">{errorMsg}</p>}
            <div className="space-y-2 mt-4">
              <button onClick={onRetryPayment} disabled={retrying}
                className="block w-full py-3 bg-[#ff6b00] text-white rounded-lg font-bold hover:bg-[#e55d00] transition disabled:opacity-70">
                {retrying ? 'Đang kết nối...' : 'Thử thanh toán lại'}
              </button>
              {viewOrdersBtn}
            </div>
          </>
        )}

        {kind === 'error' && (
          <>
            <XCircle size={72} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt hàng thất bại</h2>
            <p className="text-gray-500 text-sm mb-6">{errorMsg || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.'}</p>
            <div className="space-y-2">
              <button onClick={onRetry} className="block w-full py-3 bg-[#ff6b00] text-white rounded-lg font-bold hover:bg-[#e55d00] transition">Thử lại</button>
              <button onClick={onClose} className="block w-full py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">Đóng</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Ghi nhớ thông tin nhận hàng gần nhất của từng tài khoản (dự phòng khi sổ địa chỉ trên server trống/lỗi) ───
type RememberedInfo = { fullName?: string; phone?: string; email?: string; address?: string }
const rememberKey = (userId: string) => `cuahangmaytinh_checkout_${userId}`

const readRemembered = (userId?: string): RememberedInfo => {
  if (!userId) return {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(rememberKey(userId)) || '{}')
    return parsed && typeof parsed === 'object' ? (parsed as RememberedInfo) : {}
  } catch {
    return {}
  }
}

// ─── Main ──────────────────────────────────────────────────
function CheckoutPage() {
  const { cartItems, totalAmount, clearCart } = useCart()
  const { token, user } = useAppSelector((state) => state.auth)
  const userId = user?.id || user?._id
  const { settings } = useSiteSettings()
  const bankInfo = { bankName: settings.bankName, bankAccount: settings.bankAccount, bankAccountName: settings.bankAccountName }
  const navigate = useNavigate()
  const toast = useToast()

  // Đã đăng nhập → điền sẵn NGAY từ tài khoản + lần đặt gần nhất (khỏi chờ gọi API)
  const [form, setForm] = useState(() => {
    const remembered = token ? readRemembered(userId) : {}
    return {
      fullName: token ? (remembered.fullName || user?.fullName || '') : '',
      phone: token ? (remembered.phone || user?.phone || '') : '',
      email: token ? (remembered.email || user?.email || '') : '',
      address: token ? (remembered.address || '') : '',
      note: '',
    }
  })
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(true)
  const [errors, setErrors] = useState<FormErrors>({})
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVouchers, setAppliedVouchers] = useState<AppliedVoucher[]>([])
  const [voucherError, setVoucherError] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OrderResult | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [legal, setLegal] = useState<LegalType | null>(null)
  const [vouchers, setVouchers] = useState<PublicVoucher[]>([])
  // Các mã đang được TICK chọn (có thể chọn nhiều mã rồi bấm "Áp dụng" một lần)
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])

  // Danh sách mã đang hoạt động để khách bấm chọn
  useEffect(() => {
    api.get<PublicVoucher[]>('/vouchers')
      .then((r) => setVouchers(r.data))
      .catch(() => setVouchers([]))
  }, [])

  const availablePaymentMethods = useMemo(() => PAYMENT_METHODS.filter((method) => {
    if (method.id === 'cod') return settings.enableCod
    if (method.id === 'bank_transfer') return settings.enableBankTransfer && Boolean(settings.bankName.trim() && settings.bankAccount.trim() && settings.bankAccountName.trim())
    if (method.id === 'momo') return settings.enableMomo
    if (method.id === 'vnpay') return settings.enableVnpay
    return false
  }), [settings.enableCod, settings.enableBankTransfer, settings.bankName, settings.bankAccount, settings.bankAccountName, settings.enableMomo, settings.enableVnpay])

  useEffect(() => {
    if (!availablePaymentMethods.some((method) => method.id === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]?.id || '')
    }
  }, [availablePaymentMethods, paymentMethod])

  useEffect(() => {
    setAppliedVouchers([])
    setSelectedCodes([])
    setVoucherCode('')
    setVoucherError('')
  }, [totalAmount])

  // Khi đã đăng nhập, tự tải hồ sơ và địa chỉ đã lưu để điền sẵn thông tin nhận hàng.
  useEffect(() => {
    if (!token) return
    let active = true
    Promise.allSettled([
      api.get<UserProfile>('/users/profile'),
      api.get<SavedAddress[]>('/addresses'),
    ]).then(([profileResult, addressResult]) => {
      if (!active) return
      const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null
      const addresses = addressResult.status === 'fulfilled' ? addressResult.value.data : []
      setSavedAddresses(addresses)
      const defaultAddress = addresses.find((item) => item.isDefault) || addresses[0]
      const remembered = readRemembered(userId)
      const defaultAddressText = defaultAddress
        ? [defaultAddress.address, defaultAddress.ward, defaultAddress.district, defaultAddress.province].filter(Boolean).join(', ')
        : ''
      // Ưu tiên: sổ địa chỉ trên server → lần đặt gần nhất → hồ sơ tài khoản
      setForm((current) => ({
        ...current,
        fullName: current.fullName || defaultAddress?.name || remembered.fullName || profile?.fullName || user?.fullName || '',
        phone: current.phone || defaultAddress?.phone || remembered.phone || profile?.phone || user?.phone || '',
        email: current.email || remembered.email || profile?.email || user?.email || '',
        address: current.address || defaultAddressText || remembered.address || '',
      }))
      if (defaultAddress) setSelectedAddressId(defaultAddress.id || defaultAddress._id || '')
    })
    return () => { active = false }
  }, [token])

  // Display estimate from the same public policy; the server recalculates at order creation.
  const baseShipping = totalAmount >= settings.freeShippingFrom ? 0 : settings.defaultShippingFee
  const hasFreeShippingVoucher = appliedVouchers.some((voucher) => voucher.freeShip)
  const shippingFee = hasFreeShippingVoucher ? 0 : baseShipping
  const discountAmount = appliedVouchers.reduce((sum, voucher) => sum + (voucher.freeShip ? 0 : voucher.discountAmount), 0)
  const finalTotal = Math.max(0, totalAmount + shippingFee - discountAmount)

  // Validation form
  const validateForm = () => {
    const e: FormErrors = {}
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên'
    if (!/^0\d{9}$/.test(form.phone.trim())) e.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)'
    if (!form.address.trim()) e.address = 'Vui lòng nhập địa chỉ'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Có thể xếp chồng tối đa 5 mã; backend xác thực và tính tổng giảm giá.
  const MAX_VOUCHERS = 5

  const toggleSelectedCode = (code: string) => {
    setVoucherError('')
    setSelectedCodes((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code)
      if (current.length >= MAX_VOUCHERS) {
        setVoucherError(`Chỉ áp dụng tối đa ${MAX_VOUCHERS} mã giảm giá cho một đơn hàng`)
        return current
      }
      return [...current, code]
    })
  }

  // Số mã sẽ được áp dụng: các mã đã tick + mã gõ tay (nếu có)
  const typedCode = voucherCode.trim().toUpperCase()
  const pendingCodes = Array.from(new Set([...selectedCodes, ...(typedCode ? [typedCode] : [])]))

  // Áp dụng TẤT CẢ mã đã chọn cùng lúc; bỏ chọn hết rồi bấm = gỡ mọi mã
  const handleApplyVoucher = async () => {
    if (pendingCodes.length === 0) {
      if (appliedVouchers.length > 0) {
        setAppliedVouchers([])
        setVoucherError('')
        toast.info('Đã bỏ các mã giảm giá')
      }
      return
    }
    if (pendingCodes.length > MAX_VOUCHERS) {
      setVoucherError(`Chỉ áp dụng tối đa ${MAX_VOUCHERS} mã giảm giá cho một đơn hàng`)
      return
    }
    setVoucherLoading(true)
    setVoucherError('')
    try {
      const res = await api.post<{ vouchers: AppliedVoucher[]; discountAmount: number; freeShip: boolean }>('/vouchers/validate', {
        codes: pendingCodes,
        totalAmount,
      })
      const applied = res.data.vouchers || []
      setAppliedVouchers(applied)
      setSelectedCodes(applied.map((voucher) => voucher.code))
      setVoucherCode('')
      toast.success(`Đã áp dụng ${applied.length} mã giảm giá`)
    } catch (err) {
      setVoucherError(getErrorMessage(err, 'Mã giảm giá không hợp lệ'))
    } finally {
      setVoucherLoading(false)
    }
  }

  const handleRemoveVoucher = async (codeToRemove: string) => {
    const codes = appliedVouchers.filter((voucher) => voucher.code !== codeToRemove).map((voucher) => voucher.code)
    setSelectedCodes((current) => current.filter((code) => code !== codeToRemove))
    if (codes.length === 0) {
      setAppliedVouchers([])
      setVoucherError('')
      return
    }
    setVoucherLoading(true)
    try {
      const res = await api.post<{ vouchers: AppliedVoucher[] }>('/vouchers/validate', { codes, totalAmount })
      setAppliedVouchers(res.data.vouchers || [])
      setVoucherError('')
    } catch (err) {
      setVoucherError(getErrorMessage(err, 'Không thể tính lại các mã giảm giá còn lại'))
    } finally {
      setVoucherLoading(false)
    }
  }

  const selectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId)
    const address = savedAddresses.find((item) => (item.id || item._id) === addressId)
    if (!address) return
    setForm((current) => ({
      ...current,
      fullName: address.name || current.fullName,
      phone: address.phone || current.phone,
      address: [address.address, address.ward, address.district, address.province].filter(Boolean).join(', '),
    }))
    setErrors((current) => ({ ...current, address: undefined, phone: undefined, fullName: undefined }))
  }

  const saveCurrentAddress = async () => {
    if (!token || !saveAddressForNextTime || !form.fullName.trim() || !form.phone.trim() || !form.address.trim()) return
    try {
      const existing = savedAddresses.find((item) =>
        (selectedAddressId && (item.id || item._id) === selectedAddressId) ||
        (item.phone.trim() === form.phone.trim() && item.address.trim().toLowerCase() === form.address.trim().toLowerCase())
      )
      const body = {
        name: form.fullName.trim(), phone: form.phone.trim(), address: form.address.trim(),
        // Checkout uses one full-address field; clear split fields to avoid duplicated address on next load.
        ward: null, district: null, province: null, isDefault: true,
      }
      if (existing) await api.put(`/addresses/${existing.id || existing._id}`, body)
      else await api.post('/addresses', body)
    } catch {
      // Việc lưu sổ địa chỉ là tiện ích; không được làm hỏng một đơn hàng đã tạo thành công.
      toast.info('Đơn hàng đã tạo nhưng chưa lưu được địa chỉ cho lần mua sau')
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.warning('Vui lòng kiểm tra lại thông tin')
      return
    }
    if (cartItems.length === 0) return

    setLoading(true)
    try {
      const payload: OrderPayload = {
        customerInfo: {
          fullName: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim(),
          address: form.address.trim(),
        },
        items: cartItems.map(item => ({
          productId: item._id || item.id,
          quantity: item.quantity,
        })),
        voucherCodes: appliedVouchers.map((voucher) => voucher.code),
        paymentMethod,
        note: form.note.trim() || undefined,
      }

      const res = await api.post<Order>('/orders', payload)
      const order = res.data
      await saveCurrentAddress()
      // Ghi nhớ để lần mua sau tự điền (kể cả khi sổ địa chỉ trên server lưu không được)
      if (token && userId && saveAddressForNextTime) {
        try {
          localStorage.setItem(rememberKey(userId), JSON.stringify({
            fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(),
          }))
        } catch { /* bỏ qua nếu trình duyệt chặn localStorage */ }
      }

      // Khách vãng lai: lưu đơn vào trình duyệt để trang "Đơn hàng của tôi" xem lại được
      if (!localStorage.getItem('token')) {
        try {
          const saved = JSON.parse(localStorage.getItem('cuahangmaytinh_orders') || '[]') as Order[]
          localStorage.setItem('cuahangmaytinh_orders', JSON.stringify([order, ...saved].slice(0, 20)))
        } catch {}
      }

      await clearCart()

      const orderCode = order?.orderCode

      // Đây là cổng thanh toán GIẢ LẬP phục vụ demo đồ án, không gọi merchant thật.
      if (paymentMethod === 'vnpay' || paymentMethod === 'momo') {
        const guestToken = order.guestAccessToken ? `&guestAccessToken=${encodeURIComponent(order.guestAccessToken)}` : ''
        navigate(`/payment/mock/${paymentMethod}?order=${encodeURIComponent(orderCode || '')}${guestToken}`)
        return
      }

      // Chuyển khoản: đơn đã tạo nhưng chưa có tiền → nói rõ là đang chờ thanh toán
      if (paymentMethod === 'bank_transfer') {
        // Chế độ demo (PAYMENT_MODE=mock): mở trang ngân hàng giả lập có mã QR.
        // Chế độ live: backend từ chối → hiện hướng dẫn chuyển khoản như thường.
        try {
          const payRes = await api.post<{ paymentUrl: string; mock?: boolean }>('/payment/create', {
            orderId: order.id || order._id,
            method: 'bank_transfer',
            guestAccessToken: order.guestAccessToken,
          })
          if (payRes.data.mock) {
            const target = new URL(payRes.data.paymentUrl, window.location.origin)
            navigate(target.pathname + target.search)
            return
          }
        } catch {
          /* không có trang giả lập → rơi xuống hộp thoại hướng dẫn chuyển khoản */
        }
        setResult({ kind: 'bank_transfer', orderCode, order })
        return
      }

      // COD
      setResult({ kind: 'success', orderCode, order })
    } catch (err) {
      setResult({ kind: 'error', errorMsg: getErrorMessage(err, 'Đặt hàng thất bại. Vui lòng thử lại.') })
    } finally {
      setLoading(false)
    }
  }

  // Thử mở lại cổng thanh toán cho đơn đã tạo (khi lần đầu bị lỗi)
  const handleRetryPayment = async () => {
    if (!result?.order || !result.method) return
    setRetrying(true)
    try {
      const guestToken = result.order.guestAccessToken ? `&guestAccessToken=${encodeURIComponent(result.order.guestAccessToken)}` : ''
      navigate(`/payment/mock/${result.method}?order=${encodeURIComponent(result.order.orderCode)}${guestToken}`)
    } catch (err) {
      setResult({ ...result, errorMsg: getErrorMessage(err, 'Không kết nối được cổng thanh toán.') })
    } finally {
      setRetrying(false)
    }
  }

  if (cartItems.length === 0 && !result) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag size={80} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-500 mb-6">Vui lòng thêm sản phẩm trước khi thanh toán</p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition">
            <ArrowLeft size={18} /> Về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-[#1a73e8]">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link to="/cart" className="hover:text-[#1a73e8]">Giỏ hàng</Link>
        <ChevronRight size={14} />
        <span className="text-gray-800 font-medium">Thanh toán</span>
      </nav>

      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── LEFT ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Thông tin người mua */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-lg mb-4">Thông tin người nhận</h2>
            {token && savedAddresses.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn địa chỉ đã lưu</label>
                <select value={selectedAddressId} onChange={(e) => selectSavedAddress(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30">
                  <option value="">Nhập địa chỉ khác</option>
                  {savedAddresses.map((address) => (
                    <option key={address.id || address._id} value={address.id || address._id}>
                      {address.name} — {address.phone} — {[address.address, address.ward, address.district, address.province].filter(Boolean).join(', ')}{address.isDefault ? ' (Mặc định)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition ${errors.fullName ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0901234567"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition ${errors.phone ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="example@email.com"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition ${errors.email ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ giao hàng <span className="text-red-500">*</span></label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition ${errors.address ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú đơn hàng</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn."
                  rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition resize-none" />
              </div>
            </div>
            {token && (
              <label className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                <input type="checkbox" checked={saveAddressForNextTime} onChange={(e) => setSaveAddressForNextTime(e.target.checked)} className="accent-[#1a73e8]" />
                Lưu thông tin nhận hàng này làm địa chỉ mặc định cho lần mua sau
              </label>
            )}
          </div>

          {/* Phương thức thanh toán */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-lg mb-4">Phương thức thanh toán</h2>
            <div className="space-y-3">
              {availablePaymentMethods.map(({ id, label, desc, Icon }) => (
                <label key={id} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === id ? 'border-[#1a73e8] bg-[#1a73e8]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="accent-[#1a73e8] w-4 h-4" />
                  <Icon size={22} className={paymentMethod === id ? 'text-[#1a73e8]' : 'text-gray-400'} />
                  <div>
                    <p className="font-medium text-gray-800">{label}</p>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                </label>
              ))}
              {availablePaymentMethods.length === 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Cửa hàng hiện chưa bật phương thức thanh toán nào. Vui lòng liên hệ cửa hàng.</p>
              )}
            </div>
            {paymentMethod === 'bank_transfer' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl text-sm space-y-1">
                <p className="font-semibold text-blue-700 mb-1">Thông tin chuyển khoản:</p>
                <p><span className="text-gray-500">Ngân hàng:</span> <strong>{bankInfo.bankName}</strong></p>
                <p><span className="text-gray-500">Số tài khoản:</span> <strong>{bankInfo.bankAccount}</strong></p>
                <p><span className="text-gray-500">Chủ tài khoản:</span> <strong>{bankInfo.bankAccountName}</strong></p>
                <p><span className="text-gray-500">Nội dung:</span> <strong>Mã đơn hàng</strong> <span className="text-gray-400">(hiển thị sau khi bấm Đặt hàng)</span></p>
                <p className="text-xs text-gray-500 pt-1">Đơn chỉ được xác nhận sau khi cửa hàng nhận được tiền.</p>
              </div>
            )}
            {paymentMethod === 'momo' && (
              <div className="mt-4 p-4 bg-pink-50 rounded-xl text-sm">
                <p className="font-semibold text-pink-600 mb-1">Thanh toán qua MoMo</p>
                <p className="text-gray-600">Sau khi bấm <strong>Đặt hàng</strong>, website mở trang MoMo giả lập với QR minh họa và thao tác xác nhận demo.</p>
              </div>
            )}
            {paymentMethod === 'vnpay' && (
              <div className="mt-4 p-4 bg-sky-50 rounded-xl text-sm">
                <p className="font-semibold text-sky-700 mb-1">Thanh toán qua VNPay</p>
                <p className="text-gray-600">Sau khi bấm <strong>Đặt hàng</strong>, website mở trang VNPay giả lập với QR minh họa và thao tác xác nhận demo.</p>
              </div>
            )}
          </div>

          {/* Voucher */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Tag size={18} /> Mã giảm giá
            </h2>
            {appliedVouchers.length > 0 && (
              <div className="space-y-2 mb-4">
                {appliedVouchers.map((voucher) => (
                  <div key={voucher.code} className="flex items-center justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-green-700">🎉 {voucher.code} – {voucher.label}</p>
                      <p className="text-xs text-green-600">{voucher.freeShip ? 'Miễn phí vận chuyển' : `Giảm ${formatPrice(voucher.discountAmount)}`}</p>
                    </div>
                    <button onClick={() => handleRemoveVoucher(voucher.code)} disabled={voucherLoading} className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50">Xóa</button>
                  </div>
                ))}
              </div>
            )}
            <div>
                {vouchers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Chọn một hoặc nhiều mã (tối đa 5) rồi bấm <strong>Áp dụng</strong>:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {vouchers.map((v) => {
                        const eligible = totalAmount >= v.minOrder
                        const selected = selectedCodes.includes(v.code)
                        const applied = appliedVouchers.some((item) => item.code === v.code)
                        const alreadyFreeShip = v.type === 'freeship' && baseShipping === 0
                        return (
                          <button
                            key={v.code}
                            type="button"
                            disabled={!eligible}
                            onClick={() => toggleSelectedCode(v.code)}
                            aria-pressed={selected}
                            className={`relative text-left p-3 rounded-lg border-2 border-dashed transition ${
                              selected
                                ? 'border-[#1a73e8] bg-[#1a73e8]/5'
                                : eligible
                                  ? 'border-orange-300 bg-orange-50 hover:border-[#ff6b00]'
                                  : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <span className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center text-[11px] font-bold ${selected ? 'bg-[#1a73e8] border-[#1a73e8] text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                            <p className="font-bold text-sm text-[#ff6b00] pr-6">{v.code}{applied ? ' · đang áp dụng' : ''}</p>
                            <p className="text-xs text-gray-600">{v.label}</p>
                            {v.minOrder > 0 && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {eligible ? `Đơn từ ${formatPrice(v.minOrder)}` : `Cần đơn từ ${formatPrice(v.minOrder)}`}
                              </p>
                            )}
                            {alreadyFreeShip && <p className="text-[11px] text-amber-600 mt-0.5">Đơn của bạn đã được miễn phí vận chuyển</p>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError('') }}
                  placeholder="Hoặc nhập thêm mã giảm giá khác"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                />
                <button
                  onClick={handleApplyVoucher}
                  disabled={voucherLoading}
                  className="px-5 py-2.5 bg-[#1a73e8] text-white rounded-lg font-medium text-sm hover:bg-[#1557b0] transition disabled:opacity-60"
                >
                  {voucherLoading
                    ? <Loader2 size={16} className="animate-spin" />
                    : pendingCodes.length > 0 ? `Áp dụng (${pendingCodes.length} mã)` : appliedVouchers.length > 0 ? 'Bỏ mã' : 'Áp dụng'}
                </button>
              </div>
              </div>
            {voucherError && <p className="text-red-500 text-sm mt-2">{voucherError}</p>}
          </div>
        </div>

        {/* ── RIGHT: summary ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24 space-y-4">
            <h2 className="font-bold text-lg">Đơn hàng của bạn</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cartItems.map(item => (
                <div key={item._id || item.id} className="flex gap-3">
                  <img src={item.image || item.images?.[0] || '/placeholder.png'} alt={item.name}
                    className="w-14 h-14 object-contain bg-gray-50 rounded-lg shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">x{item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-[#ff6b00] shrink-0">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tạm tính</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span className={shippingFee === 0 ? 'text-green-600 font-medium' : ''}>
                  {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
                </span>
              </div>
              {appliedVouchers.filter((v) => !v.freeShip && v.discountAmount > 0).map((v) => (
                <div key={v.code} className="flex justify-between text-green-600">
                  <span>Giảm giá ({v.code})</span>
                  <span>-{formatPrice(v.discountAmount)}</span>
                </div>
              ))}
              {hasFreeShippingVoucher && baseShipping > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Miễn phí vận chuyển ({appliedVouchers.filter((v) => v.freeShip).map((v) => v.code).join(', ')})</span>
                  <span>-{formatPrice(baseShipping)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-bold text-base">
                <span>Tổng cộng</span>
                <span className="text-[#ff6b00] text-xl">{formatPrice(finalTotal)}</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading || !paymentMethod || availablePaymentMethods.length === 0}
              className="w-full py-3 bg-[#ff6b00] text-white rounded-lg font-bold hover:bg-[#e55d00] transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</> : 'Đặt hàng'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Bằng cách đặt hàng, bạn đồng ý với{' '}
              <button type="button" onClick={() => setLegal('terms')} className="text-[#1a73e8] hover:underline">điều khoản sử dụng</button>
            </p>
          </div>
        </div>
      </div>

      {result && (
        <ResultModal
          result={result}
          bankInfo={bankInfo}
          retrying={retrying}
          onClose={() => setResult(null)}
          onRetry={() => setResult(null)}
          onRetryPayment={handleRetryPayment}
          onViewOrders={() => navigate('/orders')}
        />
      )}

      <LegalModal type={legal} onClose={() => setLegal(null)} />
    </div>
  )
}

export default CheckoutPage
