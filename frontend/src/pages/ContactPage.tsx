import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, Loader2 } from 'lucide-react'
import { useSiteSettings } from '../context/SiteSettingsContext'
import api, { getErrorMessage } from '../api/api'
import { useAppSelector } from '../redux/hooks'

function ContactPage() {
  const { settings } = useSiteSettings()
  const { user, token } = useAppSelector((state) => state.auth)
  // Đã đăng nhập → backend lấy họ tên/email/SĐT từ tài khoản, form chỉ cần chủ đề + nội dung.
  const isLoggedIn = Boolean(user && token)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const SUBJECT_LABELS: Record<string, string> = {
    support: 'Hỗ trợ kỹ thuật',
    sales: 'Tư vấn mua hàng',
    warranty: 'Bảo hành',
    other: 'Khác',
  }

  // Gửi thật lên backend (POST /api/contacts) để admin xem được trong trang "Liên hệ"
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const subject = SUBJECT_LABELS[formData.subject]
      const message = subject ? `[${subject}] ${formData.message.trim()}` : formData.message.trim()
      await api.post('/contacts', isLoggedIn
        ? { message }
        : {
            fullName: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || undefined,
            message,
          })
      setIsSubmitted(true)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
      setTimeout(() => setIsSubmitted(false), 8000)
    } catch (err) {
      setError(getErrorMessage(err, 'Gửi tin nhắn thất bại. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold text-center mb-2">Liên hệ với chúng tôi</h1>
      <p className="text-gray-500 text-center mb-8">Hãy để lại thông tin, chúng tôi sẽ liên hệ với bạn sớm nhất</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-lg mb-4">Thông tin liên hệ</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#1a73e8]/10 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-[#1a73e8]" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Địa chỉ</h4>
                  <p className="text-gray-500 text-sm">{settings.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#1a73e8]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={20} className="text-[#1a73e8]" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Điện thoại</h4>
                  <p className="text-gray-500 text-sm">{settings.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#1a73e8]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-[#1a73e8]" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Email</h4>
                  <p className="text-gray-500 text-sm">{settings.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#1a73e8]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-[#1a73e8]" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Giờ làm việc</h4>
                  <p className="text-gray-500 text-sm">{settings.workingHours}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bản đồ Google Maps nhúng theo địa chỉ trong Cài đặt (không cần API key) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {settings.address ? (
              <>
                <iframe
                  title="Bản đồ vị trí cửa hàng"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed&hl=vi`}
                  className="w-full h-64 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 text-sm text-[#1a73e8] hover:underline"
                >
                  <MapPin size={16} /> Mở trong Google Maps
                </a>
              </>
            ) : (
              <div className="h-64 bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                Chưa có địa chỉ cửa hàng
              </div>
            )}
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-lg mb-4">Gửi tin nhắn</h3>
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle size={64} className="text-green-500 mb-4" />
                <h4 className="text-xl font-bold text-gray-800">Gửi thành công!</h4>
                <p className="text-gray-500 mt-2">Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất.</p>
                {isLoggedIn && (
                  <Link to="/account?tab=contacts" className="mt-3 text-sm text-[#1a73e8] hover:underline">
                    Xem phản hồi trong Tài khoản → Liên hệ của tôi
                  </Link>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {isLoggedIn ? (
                  <p className="text-sm text-gray-500">
                    Gửi với tài khoản <span className="font-medium text-gray-700">{user?.fullName}</span> ({user?.email})
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                        placeholder="Nhập họ tên"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                        placeholder="Nhập email"
                      />
                    </div>
                  </div>
                )}
                <div className={isLoggedIn ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {!isLoggedIn && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
                    >
                      <option value="">Chọn chủ đề</option>
                      <option value="support">Hỗ trợ kỹ thuật</option>
                      <option value="sales">Tư vấn mua hàng</option>
                      <option value="warranty">Bảo hành</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-[#1a73e8] resize-none"
                    placeholder="Nhập nội dung tin nhắn"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {submitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
