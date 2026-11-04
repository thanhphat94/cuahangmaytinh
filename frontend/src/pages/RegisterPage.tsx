import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSEO } from '../hooks/useSEO'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react'
import { registerUser } from '../redux/slices/authSlice'
import type { RegisterPayload } from '../types'
import LegalModal from '../components/LegalModal'
import type { LegalType } from '../components/LegalModal'

/** Form đăng ký — `name` map sang `fullName` của `RegisterPayload` khi submit. */
type RegisterForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

function RegisterPage() {
  useSEO({ title: 'Đăng ký tài khoản', url: '/register' })
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<RegisterForm>({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { status, token } = useAppSelector((state) => state.auth)
  const isLoading = status === 'loading'
  const [legal, setLegal] = useState<LegalType | null>(null)

  useEffect(() => {
    if (token) navigate('/account', { replace: true })
  }, [token, navigate])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    const payload: RegisterPayload = {
      fullName: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    }
    try {
      await dispatch(registerUser(payload)).unwrap()
      navigate('/account')
    } catch (err) {
      // `registerUser` reject bằng chuỗi thông điệp tiếng Việt (rejectWithValue) — giữ đúng logic cũ,
      // không dùng getErrorMessage vì nó sẽ mất message của backend khi err là string.
      setError(typeof err === 'string' ? err : 'Đăng ký thất bại')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#ff6b00] rounded-xl flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Đăng ký tài khoản</h1>
            <p className="text-gray-500 text-sm mt-1">Tạo tài khoản để mua sắm dễ dàng hơn</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  placeholder="Nhập họ tên"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  placeholder="Nhập email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  placeholder="Nhập số điện thoại"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" required className="mt-1 rounded" />
              <span className="text-sm text-gray-500">
                Tôi đồng ý với{' '}
                <button type="button" onClick={() => setLegal('terms')} className="text-[#1a73e8] hover:underline">điều khoản sử dụng</button>
                {' '}và{' '}
                <button type="button" onClick={() => setLegal('privacy')} className="text-[#1a73e8] hover:underline">chính sách bảo mật</button>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#ff6b00] text-white rounded-lg font-bold hover:bg-[#e55d00] transition disabled:bg-gray-300"
            >
              {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-[#1a73e8] font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
      <LegalModal type={legal} onClose={() => setLegal(null)} />
    </div>
  )
}

export default RegisterPage
