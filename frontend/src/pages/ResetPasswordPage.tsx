import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'
import api, { getErrorMessage } from '../api/api'

/** Hai field mật khẩu của form reset. */
type ResetForm = { newPassword: string; confirmPassword: string }

/** Trạng thái "nhỏ mắt" của từng field — key khớp với `showKey` truyền vào `PwField`. */
type ShowPw = { new: boolean; confirm: boolean }

type PwFieldProps = {
  field: keyof ResetForm;
  label: string;
  showKey: keyof ShowPw;
}

function ResetPasswordPage() {
  useSEO({ title: 'Đặt lại mật khẩu', url: '/reset-password' })
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token') || ''

  const [tokenValid, setTokenValid]   = useState<boolean | null>(null) // null=checking, true, false
  const [form, setForm]               = useState<ResetForm>({ newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw]           = useState<ShowPw>({ new: false, confirm: false })
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    if (!token) { setTokenValid(false); return }
    // Xóa token khỏi thanh địa chỉ/lịch sử ngay sau khi lấy vào state của trang.
    window.history.replaceState(window.history.state, '', window.location.pathname)
    api.post<{ valid: boolean }>('/users/verify-reset-token', { token })
      .then(r => setTokenValid(r.data.valid))
      .catch(() => setTokenValid(false))
  }, [token])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (form.newPassword.length < 8 || new TextEncoder().encode(form.newPassword).length > 72) { setError('Mật khẩu cần từ 8 ký tự và không vượt quá 72 byte UTF-8'); return }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(form.newPassword)) { setError('Mật khẩu phải có cả chữ lẫn số'); return }
    if (form.newPassword !== form.confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return }
    setLoading(true); setError('')
    try {
      await api.post('/users/reset-password', { token, newPassword: form.newPassword })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Đặt lại mật khẩu thất bại'))
    } finally {
      setLoading(false)
    }
  }

  const PwField = ({ field, label, showKey }: PwFieldProps) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type={showPw[showKey] ? 'text' : 'password'} value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition" />
        <button type="button" onClick={() => setShowPw(s => ({ ...s, [showKey]: !s[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {showPw[showKey] ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {tokenValid === null && (
          <div className="text-center py-10"><Loader2 size={36} className="animate-spin text-[#1a73e8] mx-auto" /><p className="text-gray-400 mt-3">Đang kiểm tra link...</p></div>
        )}

        {tokenValid === false && (
          <div className="text-center py-4">
            <XCircle size={60} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Link không hợp lệ</h2>
            <p className="text-gray-500 text-sm mb-6">Link đặt lại mật khẩu đã hết hạn hoặc không tồn tại.</p>
            <Link to="/forgot-password" className="inline-block px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-medium hover:bg-[#1557b0] transition">
              Yêu cầu link mới
            </Link>
          </div>
        )}

        {tokenValid === true && !done && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[#1a73e8]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock size={26} className="text-[#1a73e8]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Đặt lại mật khẩu</h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PwField field="newPassword" label="Mật khẩu mới (ít nhất 8 ký tự, có chữ + số)" showKey="new" />
              <PwField field="confirmPassword" label="Xác nhận mật khẩu mới" showKey="confirm" />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={18} className="animate-spin" />Đang xử lý...</> : 'Xác nhận mật khẩu mới'}
              </button>
            </form>
          </>
        )}

        {done && (
          <div className="text-center py-4">
            <CheckCircle2 size={60} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Thành công!</h2>
            <p className="text-gray-500 text-sm">Mật khẩu đã được cập nhật. Đang chuyển đến trang đăng nhập...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage
