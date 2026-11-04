import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'
import api from '../api/api'

function ForgotPasswordPage() {
  useSEO({ title: 'Quên mật khẩu', url: '/forgot-password' })
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) { setError('Vui lòng nhập email'); return }
    setLoading(true); setError('')
    try {
      await api.post('/users/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1a73e8] mb-6 transition">
          <ArrowLeft size={16} /> Quay lại đăng nhập
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle2 size={60} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Đã gửi email!</h2>
            <p className="text-gray-500 text-sm">Kiểm tra hộp thư của <strong>{email}</strong> và nhấn vào link để đặt lại mật khẩu. Link có hiệu lực trong <strong>30 phút</strong>.</p>
            <p className="text-gray-400 text-xs mt-3">Không thấy email? Kiểm tra thư mục Spam.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[#1a73e8]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail size={26} className="text-[#1a73e8]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Quên mật khẩu?</h1>
              <p className="text-gray-500 text-sm mt-1">Nhập email đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com" autoFocus
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition" />
                </div>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Đang gửi...</> : 'Gửi link đặt lại mật khẩu'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage
