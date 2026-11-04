
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock3, ShieldCheck } from 'lucide-react'
import api, { getErrorMessage } from '../api/api'
import { formatPrice } from '../utils/formatPrice'

type PaymentStatusResponse = {
  orderCode: string
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
  finalAmount: number
}

/**
 * QR giả lập. Không chứa dữ liệu ngân hàng,
 * không thể quét để chuyển tiền thật.
 */
function FakeQrCode({ seed }: { seed: string }) {
  const size = 29

  const matrix = useMemo(() => {
    const grid = Array.from(
      { length: size },
      () => Array.from({ length: size }, () => false)
    )

    let hash = 2166136261

    for (let i = 0; i < seed.length; i += 1) {
      hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
    }

    let state = hash >>> 0

    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return (state & 0xffff) / 0xffff > 0.5
    }

    const finder = (x: number, y: number) => {
      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 7; col += 1) {
          grid[y + row][x + col] =
            row === 0 ||
            row === 6 ||
            col === 0 ||
            col === 6 ||
            (row >= 2 && row <= 4 && col >= 2 && col <= 4)
        }
      }
    }

    finder(0, 0)
    finder(size - 7, 0)
    finder(0, size - 7)

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const inFinder =
          (x < 8 && y < 8) ||
          (x >= size - 8 && y < 8) ||
          (x < 8 && y >= size - 8)

        if (!inFinder) {
          grid[y][x] = random()
        }
      }
    }

    return grid
  }, [seed])

  return (
    <div className="relative mx-auto h-[228px] w-[228px] rounded-xl border border-gray-200 bg-white p-3 shadow-inner">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full"
        role="img"
        aria-label="Mã QR minh họa giả lập"
      >
        <rect width={size} height={size} fill="white" />

        {matrix.flatMap((row, y) =>
          row.map((filled, x) =>
            filled ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="1"
                height="1"
                fill="#111827"
              />
            ) : null
          )
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-md border-2 border-white bg-white px-2 py-1 text-[11px] font-black tracking-widest text-red-600 shadow">
          DEMO
        </div>
      </div>
    </div>
  )
}

function PaymentMockPage() {
  const { method: routeMethod } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const method = routeMethod === 'vnpay' ? 'vnpay' : 'momo'

  const orderCode = params.get('order') || ''
  const guestAccessToken = params.get('guestAccessToken') || ''

  const [payment, setPayment] =
    useState<PaymentStatusResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(120)
  const [expired, setExpired] = useState(false)

  const brand =
    method === 'momo'
      ? {
          name: 'MoMo',
          title: 'Thanh toán MoMo',
          color: 'bg-pink-600',
          soft: 'bg-pink-50',
          text: 'text-pink-700',
          hint: 'Ví điện tử MoMo',
        }
      : {
          name: 'VNPAY',
          title: 'Thanh toán VNPay',
          color: 'bg-blue-700',
          soft: 'bg-blue-50',
          text: 'text-blue-800',
          hint: 'Cổng thanh toán VNPay-QR',
        }

  // Tải trạng thái đơn hàng thật từ backend.
  useEffect(() => {
    let active = true

    if (!orderCode) {
      setError('Thiếu mã đơn hàng. Vui lòng quay lại đơn hàng.')
      setLoading(false)

      return () => {
        active = false
      }
    }

    const query = guestAccessToken
      ? `?guestAccessToken=${encodeURIComponent(guestAccessToken)}`
      : ''

    api
      .get<PaymentStatusResponse>(
        `/payment/status/${encodeURIComponent(orderCode)}${query}`
      )
      .then(({ data }) => {
        if (!active) return

        if (data.paymentMethod !== method) {
          throw new Error('Phương thức thanh toán không khớp với đơn hàng.')
        }

        setPayment(data)

        if (data.paymentStatus === 'paid') {
          navigate(
            `/payment/result?status=success&order=${encodeURIComponent(orderCode)}`,
            { replace: true }
          )
        } else if (data.orderStatus === 'cancelled') {
          setError('Đơn hàng đã bị hủy, không thể thanh toán.')
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            getErrorMessage(err, 'Không thể tải thông tin đơn hàng.')
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [guestAccessToken, method, navigate, orderCode])

  // Đồng hồ đếm ngược.
  useEffect(() => {
    if (loading || expired || payment?.paymentStatus === 'paid') {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          setExpired(true)
          return 0
        }

        return value - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [loading, expired, payment?.paymentStatus])

  // Gửi kết quả mô phỏng lên backend.
  const handleSimulation = async (success: boolean) => {
    if (!payment || busy || (expired && success)) return

    setBusy(true)
    setError('')

    try {
      await api.post('/payment/mock/complete', {
        orderCode,
        method,
        guestAccessToken: guestAccessToken || undefined,
        success,
      })

      navigate(
        `/payment/result?status=${success ? 'success' : 'failed'}&order=${encodeURIComponent(orderCode)}`
      )
    } catch (err) {
      setError(
        getErrorMessage(err, 'Không thể xử lý giao dịch giả lập.')
      )
    } finally {
      setBusy(false)
    }
  }

  const timeText =
    `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:` +
    `${String(secondsLeft % 60).padStart(2, '0')}`

  if (loading) {
    return (
      <div className="container py-20 text-center text-gray-500">
        Đang tải thông tin thanh toán...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-blue-700"
          >
            ← Cửa hàng máy tính
          </Link>

          <span className="text-xs font-bold uppercase tracking-wider text-red-600">
            Môi trường thanh toán giả lập
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div
            className={`${brand.color} flex items-center justify-between px-6 py-5 text-white`}
          >
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">
                Cổng thanh toán mô phỏng
              </p>

              <h1 className="mt-1 text-2xl font-black">
                {brand.title}
              </h1>
            </div>

            <div className="rounded-lg bg-white/15 px-4 py-2 text-lg font-black tracking-widest">
              {brand.name}
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_330px]">
            <div className="p-6 md:p-8">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Quét mã QR để thanh toán
                  </p>

                  <h2 className="text-lg font-bold text-gray-800">
                    Mở ứng dụng {brand.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                  <Clock3 size={16} />
                  {timeText}
                </div>
              </div>

              <FakeQrCode
                seed={`${method}-${orderCode}-${payment?.finalAmount || 0}`}
              />

              <div
                className={`mx-auto mt-4 max-w-sm rounded-lg ${brand.soft} p-3 text-center text-xs ${brand.text}`}
              >
                Đây là QR minh họa không có dữ liệu ngân hàng.
                Không thể quét và không phát sinh giao dịch thật.
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => handleSimulation(true)}
                  disabled={
                    !payment ||
                    busy ||
                    expired ||
                    Boolean(error)
                  }
                  className={`flex-1 rounded-lg ${brand.color} px-4 py-3 font-bold text-white shadow hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {busy
                    ? 'Đang mô phỏng...'
                    : 'Tôi đã thanh toán (giả lập)'}
                </button>

                <button
                  onClick={() => handleSimulation(false)}
                  disabled={!payment || busy}
                  className="rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy giao dịch
                </button>
              </div>

              {expired && (
                <p className="mt-3 text-center text-sm text-red-600">
                  Phiên thanh toán minh họa đã hết thời gian.
                  Bạn có thể quay lại thử lại.
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            <aside className="border-t bg-gray-50 p-6 md:border-l md:border-t-0 md:p-7">
              <h3 className="font-bold text-gray-800">
                Thông tin đơn hàng
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Mã đơn</span>
                  <strong className="text-right">
                    {orderCode || '—'}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Phương thức</span>
                  <strong>{brand.name}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Trạng thái</span>
                  <strong className="text-amber-600">
                    {payment?.paymentStatus === 'paid'
                      ? 'Đã thanh toán'
                      : 'Chờ thanh toán'}
                  </strong>
                </div>

                <div className="border-t pt-4">
                  <p className="text-gray-500">Tổng thanh toán</p>

                  <p className="mt-1 text-2xl font-black text-[#ff6b00]">
                    {formatPrice(payment?.finalAmount || 0)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <AlertTriangle size={15} />
                  Lưu ý demo
                </div>

                Trang này chỉ mô phỏng giao diện MoMo/VNPay
                cho mục đích học tập. Không nhập OTP, mật khẩu,
                thông tin thẻ và không quét QR bằng ứng dụng ngân hàng.
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                <ShieldCheck size={16} />
                Mã đơn được xác thực qua backend của cửa hàng demo
              </div>
            </aside>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          {brand.hint} · Giao diện mô phỏng, không liên kết cổng
          thanh toán chính thức
        </p>
      </div>
    </div>
  )
}

export default PaymentMockPage
