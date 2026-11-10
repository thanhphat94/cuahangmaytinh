import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertCircle, Loader2, Clock } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'
import api, { getErrorMessage } from '../api/api'
import type { Order } from '../types'

type PaymentResultState = 'loading' | 'success' | 'failed' | 'pending' | 'error'

function PaymentResultPage() {
  useSEO({ title: 'Kết quả thanh toán' })
  const [params] = useSearchParams()
  const orderCode = params.get('order') || ''
  const returnStatus = params.get('status')
  const [state, setState] = useState<PaymentResultState>('loading')
  const [message, setMessage] = useState('Đang xác minh trạng thái đơn hàng với máy chủ...')

  useEffect(() => {
    let cancelled = false
    if (!orderCode) {
      setState('error')
      setMessage('Không tìm thấy mã đơn hàng trong đường dẫn trả về.')
      return () => { cancelled = true }
    }

    const loadStatus = async () => {
      try {
        // Always send the guest capability token when we have one. The server
        // ignores it for member orders and requires it for guest orders.
        let guestAccessToken = ''
        const stored = JSON.parse(sessionStorage.getItem('cuahangmaytinh_orders') || '[]') as Order[]
        guestAccessToken = stored.find((order) => order.orderCode === orderCode)?.guestAccessToken || ''
        const query = guestAccessToken ? `?guestAccessToken=${encodeURIComponent(guestAccessToken)}` : ''
        const response = await api.get<{
          orderCode: string
          orderStatus: string
          paymentStatus: string
          finalAmount: number
        }>(`/payment/status/${encodeURIComponent(orderCode)}${query}`)
        if (cancelled) return

        if (response.data.paymentStatus === 'paid') {
          setState('success')
          setMessage(`Đơn hàng #${orderCode} đã được cổng thanh toán xác thực và ghi nhận.`)
        } else if (response.data.orderStatus === 'cancelled') {
          setState('failed')
          setMessage('Đơn hàng đã bị hủy. Nếu tài khoản thanh toán đã bị trừ tiền, vui lòng liên hệ cửa hàng để đối soát.')
        } else if (returnStatus === 'failed') {
          setState('failed')
          setMessage('Giao dịch chưa được xác nhận thanh toán. Đơn hàng vẫn được giữ để bạn kiểm tra hoặc thử lại.')
        } else {
          setState('pending')
          setMessage('Cổng thanh toán chưa xác nhận giao dịch. Vui lòng kiểm tra lại sau hoặc liên hệ cửa hàng nếu tiền đã bị trừ.')
        }
      } catch (error) {
        if (cancelled) return
        setState('error')
        setMessage(getErrorMessage(error, 'Không thể xác minh đơn hàng. Vui lòng đăng nhập đúng tài khoản hoặc sử dụng mã xác thực đơn khách.'))
      }
    }
    void loadStatus()
    return () => { cancelled = true }
  }, [orderCode, returnStatus])

  const view = {
    loading: { Icon: Loader2, color: 'text-blue-500', title: 'Đang xác minh thanh toán', spinning: true },
    success: { Icon: CheckCircle2, color: 'text-green-500', title: 'Thanh toán thành công', spinning: false },
    failed: { Icon: XCircle, color: 'text-red-500', title: 'Thanh toán chưa thành công', spinning: false },
    pending: { Icon: Clock, color: 'text-amber-500', title: 'Đang chờ xác nhận', spinning: false },
    error: { Icon: AlertCircle, color: 'text-yellow-500', title: 'Không thể xác minh', spinning: false },
  }[state]
  const { Icon, color, title, spinning } = view

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <Icon size={72} className={`mx-auto mb-4 ${color} ${spinning ? 'animate-spin' : ''}`} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
        {orderCode && <p className="mb-2 text-sm text-gray-500">Mã đơn hàng: <strong className="text-[#1a73e8]">{orderCode}</strong></p>}
        <p className="text-gray-500 text-sm mb-8">{message}</p>
        <div className="flex flex-col gap-3">
          {orderCode && (
            <Link to="/orders" className="block w-full py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition">
              Xem đơn hàng của tôi
            </Link>
          )}
          <Link to="/" className="block w-full py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PaymentResultPage
