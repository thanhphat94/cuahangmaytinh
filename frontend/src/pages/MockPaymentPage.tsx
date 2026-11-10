import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Building2, CheckCircle2, ChevronLeft, Clock, Copy, CreditCard, Loader2, QrCode, ShieldCheck, Smartphone, XCircle,
} from 'lucide-react'
import api, { getErrorMessage } from '../api/api'
import FakeQr from '../components/FakeQr'
import { useSEO } from '../hooks/useSEO'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { formatPrice } from '../utils/formatPrice'
import type { Order } from '../types'

type Method = 'momo' | 'vnpay' | 'bank'

type PaymentStatus = {
  orderCode: string
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
  finalAmount: number
}

const SESSION_SECONDS = 10 * 60

const BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank',
  'MB Bank', 'Techcombank', 'ACB', 'NCB',
]

const formatClock = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Cổng thanh toán GIẢ LẬP của MoMo / VNPay dùng cho demo đồ án (backend PAYMENT_MODE=mock).
 * Không có tiền thật được chuyển; bấm "Thanh toán thành công" để mô phỏng giao dịch hoàn tất.
 */
function MockPaymentPage() {
  const { method: methodParam } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const method: Method | null = methodParam === 'momo' || methodParam === 'vnpay' || methodParam === 'bank' ? methodParam : null
  const orderCode = params.get('order') || ''
  const isMomo = method === 'momo'
  const isBank = method === 'bank'
  // Giá trị paymentMethod tương ứng lưu trong đơn hàng
  const serverMethod = method === 'bank' ? 'bank_transfer' : method
  const methodLabel = isBank ? 'chuyển khoản ngân hàng' : isMomo ? 'MoMo' : 'VNPay'
  const { settings } = useSiteSettings()
  const [copied, setCopied] = useState('')
  useSEO({ title: isBank ? 'Chuyển khoản ngân hàng (giả lập)' : isMomo ? 'Cổng thanh toán MoMo (giả lập)' : 'Cổng thanh toán VNPay (giả lập)' })

  const [info, setInfo] = useState<PaymentStatus | null>(null)
  const [loadError, setLoadError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS)
  const [busy, setBusy] = useState<'success' | 'failed' | null>(null)
  const [actionError, setActionError] = useState('')

  // VNPay: tab + các bước thẻ ATM
  const [tab, setTab] = useState<'qr' | 'atm'>('qr')
  const [bankTab, setBankTab] = useState<'qr' | 'manual'>('qr')
  const [bank, setBank] = useState('')
  const [cardStep, setCardStep] = useState<'bank' | 'card' | 'otp'>('bank')
  const [cardNumber, setCardNumber] = useState('9704198526191432198')
  const [cardName, setCardName] = useState('NGUYEN VAN A')
  const [cardDate, setCardDate] = useState('07/15')
  const [otp, setOtp] = useState('')

  // Mã xác thực đơn khách vãng lai: ưu tiên từ URL, nếu không có thì lấy từ đơn đã lưu trong trình duyệt
  const guestAccessToken = useMemo(() => {
    const fromUrl = params.get('guestAccessToken')
    if (fromUrl) return fromUrl
    try {
      const stored = JSON.parse(sessionStorage.getItem('cuahangmaytinh_orders') || '[]') as Order[]
      return stored.find((o) => o.orderCode === orderCode)?.guestAccessToken || ''
    } catch {
      return ''
    }
  }, [params, orderCode])

  const goToResult = useCallback((status: 'success' | 'failed') => {
    navigate(`/payment/result?order=${encodeURIComponent(orderCode)}&status=${status}`, { replace: true })
  }, [navigate, orderCode])

  // Tải thông tin đơn
  useEffect(() => {
    if (!method || !orderCode) return
    let cancelled = false
    const query = guestAccessToken ? `?guestAccessToken=${encodeURIComponent(guestAccessToken)}` : ''
    api.get<PaymentStatus>(`/payment/status/${encodeURIComponent(orderCode)}${query}`)
      .then((res) => {
        if (cancelled) return
        if (res.data.paymentStatus === 'paid') { goToResult('success'); return }
        if (res.data.paymentMethod !== serverMethod) {
          setLoadError(`Đơn hàng này không thanh toán bằng ${methodLabel}.`)
          return
        }
        if (res.data.orderStatus === 'cancelled') {
          setLoadError('Đơn hàng đã bị huỷ nên không thể thanh toán.')
          return
        }
        setInfo(res.data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, 'Không tải được thông tin đơn hàng. Vui lòng đăng nhập đúng tài khoản đã đặt hàng.'))
      })
    return () => { cancelled = true }
  }, [method, serverMethod, methodLabel, orderCode, guestAccessToken, goToResult])

  // Đếm ngược phiên thanh toán
  useEffect(() => {
    if (!info) return
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [info])

  const expired = secondsLeft <= 0

  const submitOutcome = async (outcome: 'success' | 'failed') => {
    if (!info) return
    setBusy(outcome)
    setActionError('')
    try {
      // Tạo cảm giác "đang xử lý giao dịch" giống cổng thật
      await new Promise((resolve) => setTimeout(resolve, 1400))
      await api.post('/payment/mock/confirm', {
        orderCode: info.orderCode,
        outcome,
        guestAccessToken: guestAccessToken || undefined,
      })
      goToResult(outcome)
    } catch (err) {
      setActionError(getErrorMessage(err, 'Không thể hoàn tất giao dịch giả lập. Vui lòng thử lại.'))
      setBusy(null)
    }
  }

  const submitOtp = () => {
    if (otp.trim() !== '123456') {
      setActionError('Mã OTP không đúng. (Gợi ý demo: 123456)')
      return
    }
    void submitOutcome('success')
  }

  // ─── Trạng thái lỗi / chưa sẵn sàng ───
  if (!method || !orderCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle size={56} className="mx-auto text-amber-500 mb-3" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Đường dẫn thanh toán không hợp lệ</h1>
          <p className="text-sm text-gray-500 mb-6">Thiếu mã đơn hàng hoặc phương thức thanh toán.</p>
          <Link to="/" className="inline-block px-6 py-3 bg-[#1a73e8] text-white rounded-lg font-medium">Về trang chủ</Link>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle size={56} className="mx-auto text-red-500 mb-3" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Không thể mở trang thanh toán</h1>
          <p className="text-sm text-gray-500 mb-6">{loadError}</p>
          <div className="flex flex-col gap-2">
            <Link to="/orders" className="block py-3 bg-[#1a73e8] text-white rounded-lg font-medium">Xem đơn hàng của tôi</Link>
            <Link to="/" className="block py-3 border border-gray-200 rounded-lg text-gray-700">Về trang chủ</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={40} className="animate-spin text-[#1a73e8]" />
      </div>
    )
  }

  const brand = isBank
    ? { name: 'VietQR', primary: '#0f766e', soft: '#f0fdfa', qr: '#0f766e', logo: 'VQR' }
    : isMomo
      ? { name: 'MoMo', primary: '#a50064', soft: '#fdf2f8', qr: '#a50064', logo: 'M' }
      : { name: 'VNPAY', primary: '#005baa', soft: '#eff6ff', qr: '#005baa', logo: 'VN' }

  const description = isBank ? `Chuyển khoản đơn hàng ${info.orderCode}` : `Thanh toán đơn hàng ${info.orderCode}`

  const bankRows: { key: string; label: string; value: string }[] = [
    { key: 'bank', label: 'Ngân hàng thụ hưởng', value: settings.bankName || 'Vietcombank' },
    { key: 'account', label: 'Số tài khoản', value: settings.bankAccount || '1234567890' },
    { key: 'owner', label: 'Chủ tài khoản', value: settings.bankAccountName || 'CUA HANG MAY TINH' },
    { key: 'amount', label: 'Số tiền', value: String(info.finalAmount) },
    { key: 'content', label: 'Nội dung chuyển khoản', value: info.orderCode },
  ]

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      /* trình duyệt chặn clipboard — vẫn hiện trạng thái để demo */
    }
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  const OutcomeButtons = (
    <div className="space-y-2">
      <button
        onClick={() => submitOutcome('success')}
        disabled={busy !== null || expired}
        className="w-full py-3 rounded-lg text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: brand.primary }}
      >
        {busy === 'success' ? <><Loader2 size={18} className="animate-spin" /> Đang xử lý giao dịch...</> : <><CheckCircle2 size={18} /> {isBank ? 'Giả lập: Đã chuyển khoản thành công' : 'Giả lập: Đã quét mã & thanh toán thành công'}</>}
      </button>
      <button
        onClick={() => submitOutcome('failed')}
        disabled={busy !== null}
        className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition disabled:opacity-60"
      >
        {busy === 'failed' ? 'Đang xử lý...' : 'Giả lập: Thanh toán thất bại / Huỷ giao dịch'}
      </button>
    </div>
  )

  const QrPanel = (
    <div className="text-center">
      <div className="inline-block p-3 bg-white rounded-xl border-2" style={{ borderColor: brand.primary }}>
        <div className={expired ? 'opacity-20' : ''}>
          <FakeQr seed={`${brand.name}-${info.orderCode}-${info.finalAmount}`} size={216} color={brand.qr} logoText={brand.logo} logoBg="#fff" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <Clock size={15} className={expired ? 'text-red-500' : 'text-gray-500'} />
        {expired ? (
          <span className="text-red-500 font-medium">Mã QR đã hết hạn</span>
        ) : (
          <span className="text-gray-600">Mã QR hết hạn sau <strong style={{ color: brand.primary }}>{formatClock(secondsLeft)}</strong></span>
        )}
      </div>

      {expired ? (
        <button onClick={() => setSecondsLeft(SESSION_SECONDS)} className="mt-3 px-5 py-2 rounded-lg text-white font-medium" style={{ background: brand.primary }}>
          Tạo lại mã QR
        </button>
      ) : (
        <p className="mt-2 text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Đang chờ bạn quét mã...
        </p>
      )}

      <ol className="mt-5 text-left text-sm text-gray-600 space-y-1.5 max-w-xs mx-auto">
        {isBank ? (
          <>
            <li><strong>1.</strong> Mở ứng dụng <strong>ngân hàng</strong> (Mobile Banking) trên điện thoại</li>
            <li><strong>2.</strong> Chọn <strong>Quét mã QR</strong> / <strong>Chuyển tiền</strong></li>
            <li><strong>3.</strong> Quét mã, kiểm tra số tiền và nội dung rồi xác nhận chuyển khoản</li>
          </>
        ) : isMomo ? (
          <>
            <li><strong>1.</strong> Mở ứng dụng <strong>MoMo</strong> trên điện thoại</li>
            <li><strong>2.</strong> Chọn <strong>Quét mã</strong> (biểu tượng QR)</li>
            <li><strong>3.</strong> Quét mã bên trên và xác nhận thanh toán</li>
          </>
        ) : (
          <>
            <li><strong>1.</strong> Mở ứng dụng ngân hàng có hỗ trợ <strong>VNPAY-QR</strong></li>
            <li><strong>2.</strong> Chọn chức năng <strong>Quét mã QR</strong></li>
            <li><strong>3.</strong> Quét mã bên trên và xác nhận giao dịch</li>
          </>
        )}
      </ol>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: isBank ? 'linear-gradient(160deg,#0f766e 0%,#134e4a 100%)' : isMomo ? 'linear-gradient(160deg,#a50064 0%,#6b0044 100%)' : 'linear-gradient(160deg,#eaf3ff 0%,#dbeafe 100%)' }}>
      {/* Dải thông báo demo */}
      <div className="bg-amber-400 text-amber-950 text-xs sm:text-sm text-center py-2 px-3 font-medium">
        ⚠ Đây là cổng thanh toán GIẢ LẬP phục vụ demo đồ án — không có giao dịch tiền thật nào được thực hiện.
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Header cổng */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow" style={{ background: isBank ? '#14b8a6' : isMomo ? '#d82d8b' : '#005baa' }}>
              {isBank ? <Building2 size={22} /> : isMomo ? 'mo' : 'VN'}
            </div>
            <div className={isBank || isMomo ? 'text-white' : 'text-gray-800'}>
              <p className="font-bold leading-tight">{isBank ? 'Chuyển khoản ngân hàng' : isMomo ? 'Ví MoMo' : 'Cổng thanh toán VNPAY'}</p>
              <p className="text-xs opacity-80 flex items-center gap-1"><ShieldCheck size={12} /> Môi trường giả lập</p>
            </div>
          </div>
          <Link to="/orders" className={`text-sm flex items-center gap-1 hover:underline ${isBank || isMomo ? 'text-white/90' : 'text-gray-600'}`}>
            <ChevronLeft size={16} /> Quay lại cửa hàng
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Thông tin đơn hàng */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-bold text-gray-800 mb-4">Thông tin đơn hàng</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-400 text-xs">Nhà cung cấp</dt>
                <dd className="font-medium text-gray-800">Cửa Hàng Máy Tính</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Mã đơn hàng</dt>
                <dd className="font-medium text-gray-800">{info.orderCode}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Mô tả</dt>
                <dd className="text-gray-700">{description}</dd>
              </div>
              <div className="pt-3 border-t">
                <dt className="text-gray-400 text-xs">Số tiền thanh toán</dt>
                <dd className="text-2xl font-extrabold" style={{ color: brand.primary }}>{formatPrice(info.finalAmount)}</dd>
              </div>
            </dl>
            <div className="mt-5 text-xs text-gray-400 flex items-center gap-1.5">
              <Clock size={13} /> Phiên thanh toán còn {expired ? '0:00' : formatClock(secondsLeft)}
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div className="md:col-span-3 bg-white rounded-2xl shadow-lg p-6">
            {isBank ? (
              <>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5">
                  <button onClick={() => setBankTab('qr')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${bankTab === 'qr' ? 'bg-white shadow-sm text-[#0f766e]' : 'text-gray-500'}`}>
                    <QrCode size={16} /> Quét mã VietQR
                  </button>
                  <button onClick={() => setBankTab('manual')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${bankTab === 'manual' ? 'bg-white shadow-sm text-[#0f766e]' : 'text-gray-500'}`}>
                    <Building2 size={16} /> Chuyển khoản thủ công
                  </button>
                </div>

                {bankTab === 'qr' ? QrPanel : (
                  <div className="space-y-2">
                    {bankRows.map((row) => (
                      <div key={row.key} className="flex items-center justify-between gap-3 border rounded-lg px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">{row.label}</p>
                          <p className="font-semibold text-gray-800 break-all">
                            {row.key === 'amount' ? formatPrice(Number(row.value)) : row.value}
                          </p>
                        </div>
                        <button
                          onClick={() => copyValue(row.key, row.value)}
                          className="shrink-0 text-xs px-2.5 py-1.5 rounded-md border hover:bg-gray-50 flex items-center gap-1 text-gray-600"
                        >
                          <Copy size={12} /> {copied === row.key ? 'Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 pt-1">
                      Vui lòng nhập ĐÚNG số tiền và nội dung chuyển khoản để đơn được xác nhận tự động.
                    </p>
                  </div>
                )}
                <div className="mt-6">{OutcomeButtons}</div>
              </>
            ) : isMomo ? (
              <>
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Smartphone size={18} style={{ color: brand.primary }} /> Quét mã bằng ứng dụng MoMo</h2>
                {QrPanel}
                <div className="mt-6">{OutcomeButtons}</div>
              </>
            ) : (
              <>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5">
                  <button onClick={() => { setTab('qr'); setActionError('') }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${tab === 'qr' ? 'bg-white shadow-sm text-[#005baa]' : 'text-gray-500'}`}>
                    <QrCode size={16} /> Quét mã QR
                  </button>
                  <button onClick={() => { setTab('atm'); setActionError('') }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${tab === 'atm' ? 'bg-white shadow-sm text-[#005baa]' : 'text-gray-500'}`}>
                    <CreditCard size={16} /> Thẻ ATM nội địa
                  </button>
                </div>

                {tab === 'qr' && (
                  <>
                    {QrPanel}
                    <div className="mt-6">{OutcomeButtons}</div>
                  </>
                )}

                {tab === 'atm' && (
                  <div>
                    {cardStep === 'bank' && (
                      <>
                        <p className="text-sm text-gray-600 mb-3">Chọn ngân hàng của bạn</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {BANKS.map((b) => (
                            <button key={b} onClick={() => { setBank(b); setCardStep('card') }}
                              className="py-4 px-2 border rounded-lg text-sm font-semibold text-gray-700 hover:border-[#005baa] hover:bg-blue-50 transition">
                              {b}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {cardStep === 'card' && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">Thẻ <strong>{bank}</strong> — nhập thông tin thẻ</p>
                        <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Số thẻ"
                          className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#005baa]" />
                        <input value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} placeholder="Tên chủ thẻ (không dấu)"
                          className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#005baa]" />
                        <input value={cardDate} onChange={(e) => setCardDate(e.target.value)} placeholder="Ngày phát hành (MM/YY)"
                          className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#005baa]" />
                        <p className="text-xs text-gray-400">Dữ liệu thẻ mẫu đã điền sẵn — chỉ để demo, không được lưu lại.</p>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setCardStep('bank')} className="px-4 py-2.5 border rounded-lg text-gray-600">Đổi ngân hàng</button>
                          <button
                            onClick={() => { if (cardNumber.trim() && cardName.trim() && cardDate.trim()) { setActionError(''); setCardStep('otp') } else setActionError('Vui lòng nhập đủ thông tin thẻ') }}
                            className="flex-1 py-2.5 rounded-lg text-white font-bold" style={{ background: brand.primary }}>
                            Tiếp tục
                          </button>
                        </div>
                      </div>
                    )}

                    {cardStep === 'otp' && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">Nhập mã OTP đã gửi tới số điện thoại đăng ký với ngân hàng <strong>{bank}</strong></p>
                        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Mã OTP 6 số" inputMode="numeric"
                          className="w-full px-4 py-3 border rounded-lg text-center text-xl tracking-[0.5em] focus:outline-none focus:border-[#005baa]" />
                        <p className="text-xs text-gray-400 text-center">Gợi ý demo: nhập <strong>123456</strong></p>
                        <div className="flex gap-2">
                          <button onClick={() => submitOutcome('failed')} disabled={busy !== null} className="px-4 py-2.5 border rounded-lg text-gray-600 disabled:opacity-60">Huỷ giao dịch</button>
                          <button onClick={submitOtp} disabled={busy !== null || otp.length < 6}
                            className="flex-1 py-2.5 rounded-lg text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: brand.primary }}>
                            {busy === 'success' ? <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</> : 'Xác nhận thanh toán'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {actionError && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{actionError}</p>
            )}
          </div>
        </div>

        <p className={`text-center text-xs mt-6 ${isBank || isMomo ? 'text-white/70' : 'text-gray-500'}`}>
          Trang mô phỏng giao diện {isBank ? 'ứng dụng ngân hàng (VietQR)' : `cổng ${brand.name}`} — đồ án website bán máy tính.
        </p>
      </div>
    </div>
  )
}

export default MockPaymentPage
