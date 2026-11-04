import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Save, Store, Truck, CreditCard, Bell, Shield, Database, AlertTriangle, Check } from 'lucide-react'
import { useSiteSettings } from '../../context/SiteSettingsContext'
import { getErrorMessage } from '../../api/api'
import type { SiteSettings } from '../../types'

const TABS = [
  { key: 'general', label: 'Thông tin chung', icon: Store },
  { key: 'shipping', label: 'Vận chuyển', icon: Truck },
  { key: 'payment', label: 'Thanh toán', icon: CreditCard },
  { key: 'notifications', label: 'Thông báo', icon: Bell },
  { key: 'backup', label: 'Sao lưu', icon: Database },
  { key: 'security', label: 'Bảo mật', icon: Shield },
]

function AdminSettings() {
  const { settings, updateSettings } = useSiteSettings()
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState<SiteSettings>({ ...settings })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()

  useEffect(() => setFormData({ ...settings }), [settings])
  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab')
    if (tabParam && TABS.some((tab) => tab.key === tabParam)) setActiveTab(tabParam)
  }, [location.search])

  const updateField = (field: keyof SiteSettings, value: string | number | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }))
    setSuccess(false)
    setError('')
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError('')
    try {
      await updateSettings({
        storeName: formData.storeName.trim(),
        tagline: formData.tagline.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        hotline: formData.hotline.trim(),
        address: formData.address.trim(),
        description: formData.description.trim(),
        workingHours: formData.workingHours.trim(),
        defaultShippingFee: Number(formData.defaultShippingFee),
        freeShippingFrom: Number(formData.freeShippingFrom),
        enableCod: formData.enableCod,
        enableBankTransfer: formData.enableBankTransfer,
        bankName: formData.bankName.trim(),
        bankAccount: formData.bankAccount.trim(),
        bankAccountName: formData.bankAccountName.trim(),
        enableMomo: formData.enableMomo,
        enableVnpay: formData.enableVnpay,
      })
      setSuccess(true)
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Không thể lưu cài đặt. Vui lòng thử lại.'))
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ field, label, description }: { field: keyof SiteSettings; label: string; description?: string }) => (
    <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean(formData[field])}
        onChange={(event) => updateField(field, event.target.checked)}
        className="mt-1 h-4 w-4 rounded accent-[#1a73e8]"
      />
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {description && <span className="block text-xs text-gray-500 mt-1">{description}</span>}
      </span>
    </label>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cài đặt hệ thống</h1>
        <p className="mt-1 text-sm text-gray-500">Các thay đổi được lưu vào PostgreSQL và áp dụng ở phía máy chủ.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${activeTab === tab.key ? 'bg-[#1a73e8] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <form onSubmit={handleSave} className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {activeTab === 'general' && (
            <section className="space-y-4">
              <h2 className="font-bold text-lg">Thông tin cửa hàng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">Tên cửa hàng
                  <input value={formData.storeName} onChange={(e) => updateField('storeName', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" maxLength={160} />
                </label>
                <label className="block text-sm font-medium text-gray-700">Slogan
                  <input value={formData.tagline} onChange={(e) => updateField('tagline', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" maxLength={200} />
                </label>
                <label className="block text-sm font-medium text-gray-700">Email
                  <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-gray-700">Điện thoại
                  <input value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-gray-700">Hotline
                  <input value={formData.hotline} onChange={(e) => updateField('hotline', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-gray-700">Giờ làm việc
                  <input value={formData.workingHours} onChange={(e) => updateField('workingHours', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">Địa chỉ
                <textarea rows={2} value={formData.address} onChange={(e) => updateField('address', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Mô tả
                <textarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
            </section>
          )}

          {activeTab === 'shipping' && (
            <section className="space-y-4">
              <h2 className="font-bold text-lg">Chính sách vận chuyển</h2>
              <p className="text-sm text-gray-500">Backend tự tính phí khi tạo đơn; dữ liệu gửi từ trình duyệt không được dùng làm căn cứ thanh toán.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">Phí vận chuyển mặc định (đ)
                  <input type="number" min={0} step={1000} value={formData.defaultShippingFee} onChange={(e) => updateField('defaultShippingFee', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-gray-700">Miễn phí vận chuyển từ (đ)
                  <input type="number" min={0} step={1000} value={formData.freeShippingFrom} onChange={(e) => updateField('freeShippingFrom', Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
              </div>
              <p className="text-xs text-gray-500">Đặt ngưỡng bằng 0 để mọi đơn hàng được miễn phí vận chuyển.</p>
            </section>
          )}

          {activeTab === 'payment' && (
            <section className="space-y-4">
              <h2 className="font-bold text-lg">Phương thức thanh toán</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Toggle field="enableCod" label="Thanh toán khi nhận hàng (COD)" />
                <Toggle field="enableBankTransfer" label="Chuyển khoản ngân hàng" description="Chỉ khả dụng khi đã điền đủ thông tin tài khoản bên dưới." />
                <Toggle field="enableMomo" label="Ví điện tử MoMo" description="Cần cấu hình MOMO_PARTNER_CODE, MOMO_ACCESS_KEY và MOMO_SECRET_KEY ở backend/.env." />
                <Toggle field="enableVnpay" label="VNPay" description="Cần cấu hình VNPAY_TMN_CODE và VNPAY_HASH_SECRET ở backend/.env." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-sm font-medium text-gray-700">Ngân hàng
                  <input value={formData.bankName} onChange={(e) => updateField('bankName', e.target.value)} placeholder="VD: Vietcombank" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-gray-700">Số tài khoản
                  <input value={formData.bankAccount} onChange={(e) => updateField('bankAccount', e.target.value)} placeholder="Số tài khoản nhận tiền" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-gray-700">Chủ tài khoản
                  <input value={formData.bankAccountName} onChange={(e) => updateField('bankAccountName', e.target.value)} placeholder="Tên chủ tài khoản" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Bật phương thức ở đây không thay thế việc đăng ký tài khoản merchant và cấu hình khóa API thật. Backend sẽ từ chối tạo đơn online nếu thiếu cấu hình cổng thanh toán.
              </div>
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="space-y-3">
              <h2 className="font-bold text-lg">Thông báo</h2>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                Email xác nhận đơn hàng đã được gửi qua cấu hình SMTP trong backend/.env. Các tùy chọn thông báo theo từng sự kiện và thông báo marketing chưa được triển khai thành cài đặt lưu trữ, vì vậy không hiển thị công tắc giả ở đây.
              </div>
              <p className="text-sm text-gray-600">Để bật email, cấu hình SMTP_HOST, SMTP_PORT, SMTP_USER và SMTP_PASS trong backend/.env.</p>
            </section>
          )}

          {activeTab === 'backup' && (
            <section className="space-y-3">
              <h2 className="font-bold text-lg">Sao lưu dữ liệu</h2>
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="shrink-0" size={20} />
                <p>Website chưa có cơ chế backup/restore tự động. Mục này chỉ cung cấp hướng dẫn để tránh hiển thị nút sao lưu giả.</p>
              </div>
              <p className="text-sm text-gray-700">Có thể sao lưu thủ công từ máy chủ đang chạy PostgreSQL bằng lệnh:</p>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-200">pg_dump "$DATABASE_URL" --format=custom --file=cuahangmaytinh.backup</pre>
              <p className="text-sm text-gray-700">Khôi phục vào database đích bằng:</p>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-200">pg_restore --clean --if-exists --dbname="$DATABASE_URL" cuahangmaytinh.backup</pre>
              <p className="text-xs text-gray-500">Lưu file backup ở nơi riêng tư, mã hóa và kiểm tra khôi phục định kỳ. Không lưu backup trong thư mục public của website.</p>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="space-y-3">
              <h2 className="font-bold text-lg">Bảo mật</h2>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Xác thực hai yếu tố (2FA) chưa được triển khai. Không bật công tắc 2FA cho đến khi có luồng cấp bí mật, xác minh mã và cơ chế khôi phục tài khoản hoàn chỉnh.
              </div>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
                <li>Dùng mật khẩu mạnh và đổi mật khẩu seed mặc định ngay sau khi cài đặt.</li>
                <li>Không đưa JWT_SECRET, DATABASE_URL hoặc khóa cổng thanh toán vào frontend.</li>
                <li>Chỉ cấp role admin cho tài khoản quản trị cần thiết.</li>
                <li>Dùng HTTPS khi triển khai công khai và bảo vệ file backend/.env.</li>
              </ul>
            </section>
          )}

          <div className="border-t pt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1557b0] disabled:opacity-60">
              <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
            {success && <span className="inline-flex items-center gap-1 text-sm text-green-700"><Check size={16} /> Đã lưu vào hệ thống</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminSettings
