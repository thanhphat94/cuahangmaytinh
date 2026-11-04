import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { User, Mail, Phone, Package, LogOut, Edit2, Lock, Save, X, Loader2, Eye, EyeOff } from 'lucide-react'
import { logout, setUser } from '../redux/slices/authSlice'
import { useToast } from '../components/Toast'
import api, { getErrorMessage } from '../api/api'
import type { User as UserType } from '../types'
import MyContacts from '../components/MyContacts'

type PwInputProps = {
  label: string;
  value: string;
  show: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleShow: () => void;
}

/** Tách PwInput ra ngoài component AccountPage để tránh bị unmount mất focus khi gõ */
function PwInput({ label, value, show, onChange, onToggleShow }: PwInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function AccountPage() {
  const dispatch  = useAppDispatch()
  const navigate  = useNavigate()
  const toast     = useToast()
  const { user, token } = useAppSelector((state) => state.auth)

  const [profile, setProfile]       = useState<UserType | null>(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState(() => (new URLSearchParams(window.location.search).get('tab') === 'contacts' ? 'contacts' : 'info')) // 'info' | 'password' | 'contacts'

  // Edit profile state
  const [editing, setEditing]       = useState(false)
  const [editForm, setEditForm]     = useState({ fullName: '', phone: '' })
  const [saving, setSaving]         = useState(false)

  // Change password state
  const [pwForm, setPwForm]         = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw]         = useState({ current: false, newPw: false, confirm: false })
  const [pwLoading, setPwLoading]   = useState(false)

  if (!token) return <Navigate to="/login" replace />

  // ✅ FIX: Fetch profile từ API thay vì đọc stale Redux store
  useEffect(() => {
    document.title = 'Tài khoản của tôi — Cửa Hàng Máy Tính'
    api.get<UserType>('/users/profile')
      .then(res => {
        setProfile(res.data)
        setEditForm({ fullName: res.data.fullName || '', phone: res.data.phone || '' })
      })
      .catch(() => toast.error('Không thể tải thông tin tài khoản'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async () => {
    if (!editForm.fullName.trim()) { toast.warning('Vui lòng nhập họ tên'); return }
    setSaving(true)
    try {
      const res = await api.put<UserType>('/users/profile', editForm)
      setProfile(res.data)
      if (user) dispatch(setUser({ ...user, fullName: res.data.fullName }))
      setEditing(false)
      toast.success('Cập nhật thông tin thành công')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Cập nhật thất bại'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword) { toast.warning('Nhập mật khẩu hiện tại'); return }
    if (pwForm.newPassword.length < 8) { toast.warning('Mật khẩu mới phải ít nhất 8 ký tự'); return }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(pwForm.newPassword)) {
      toast.warning('Mật khẩu mới phải có cả chữ lẫn số'); return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.warning('Mật khẩu xác nhận không khớp'); return }

    setPwLoading(true)
    try {
      await api.put('/users/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      toast.success('Đổi mật khẩu thành công')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTab('info')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Đổi mật khẩu thất bại'))
    } finally {
      setPwLoading(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Tài khoản của tôi</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={36} className="animate-spin text-[#1a73e8]" /></div>
      ) : (
        <div className="space-y-5">
          {/* Avatar + tên */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1a73e8] to-[#0d47a1] rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {profile?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="font-bold text-lg">{profile?.fullName}</h2>
                <p className="text-sm text-gray-500">{profile?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tham gia: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {[{ id: 'info', label: 'Thông tin cá nhân', Icon: User },
              { id: 'password', label: 'Đổi mật khẩu', Icon: Lock },
              { id: 'contacts', label: 'Liên hệ của tôi', Icon: Mail }].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => { setTab(id); setEditing(false) }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === id ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {/* Tab: thông tin */}
          {tab === 'info' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                    <input value={editForm.fullName}
                      onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="0901234567"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveProfile} disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-medium hover:bg-[#1557b0] transition disabled:opacity-60">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
                    </button>
                    <button onClick={() => setEditing(false)}
                      className="flex items-center gap-2 px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                      <X size={14} /> Huỷ
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <User size={17} className="text-gray-400 shrink-0" />
                      <span>{profile?.fullName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Mail size={17} className="text-gray-400 shrink-0" />
                      <span>{profile?.email}</span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <Phone size={17} className="text-gray-400 shrink-0" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-2 mt-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:border-[#1a73e8] hover:text-[#1a73e8] transition">
                    <Edit2 size={14} /> Chỉnh sửa
                  </button>
                </>
              )}
            </div>
          )}

          {/* Tab: liên hệ của tôi + phản hồi từ admin */}
          {tab === 'contacts' && <MyContacts />}

          {/* Tab: đổi mật khẩu */}
          {tab === 'password' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <PwInput
                label="Mật khẩu hiện tại"
                value={pwForm.currentPassword}
                show={showPw.current}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                onToggleShow={() => setShowPw(s => ({ ...s, current: !s.current }))}
              />
              <PwInput
                label="Mật khẩu mới (ít nhất 8 ký tự, có chữ và số)"
                value={pwForm.newPassword}
                show={showPw.newPw}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                onToggleShow={() => setShowPw(s => ({ ...s, newPw: !s.newPw }))}
              />
              <PwInput
                label="Xác nhận mật khẩu mới"
                value={pwForm.confirmPassword}
                show={showPw.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                onToggleShow={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
              />
              <button onClick={handleChangePassword} disabled={pwLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8] text-white rounded-lg text-sm font-medium hover:bg-[#1557b0] transition disabled:opacity-60">
                {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Đổi mật khẩu
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link to="/orders"
              className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition text-sm font-medium">
              <Package size={16} /> Đơn hàng của tôi
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium">
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountPage
