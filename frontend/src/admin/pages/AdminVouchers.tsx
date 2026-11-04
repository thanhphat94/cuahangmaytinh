import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Copy, Loader2, Plus, Pencil, Tag, Trash2, X } from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import type { Voucher, VoucherType } from '../../types'
import { useToast } from '../../components/Toast'

type VoucherDraft = {
  code: string
  type: VoucherType
  value: string
  label: string
  minOrder: string
  usageLimit: string
  active: boolean
  startsAt: string
  expiresAt: string
}

const EMPTY_DRAFT: VoucherDraft = {
  code: '', type: 'percent', value: '10', label: '', minOrder: '0',
  usageLimit: '', active: true, startsAt: '', expiresAt: '',
}
const TYPE_LABEL: Record<VoucherType, string> = { percent: 'Phần trăm', flat: 'Số tiền cố định', freeship: 'Miễn phí ship' }
const TYPE_COLOR: Record<VoucherType, string> = {
  percent: 'bg-blue-100 text-blue-700',
  flat: 'bg-green-100 text-green-700',
  freeship: 'bg-purple-100 text-purple-700',
}

const asLocalDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function AdminVouchers() {
  const toast = useToast()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<VoucherDraft>(EMPTY_DRAFT)
  const [formError, setFormError] = useState('')

  const fetchVouchers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get<Voucher[]>('/vouchers/list')
      setVouchers(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách voucher'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    document.title = 'Quản lý voucher — Admin'
    void fetchVouchers()
  }, [fetchVouchers])

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(`Đã copy mã "${code}"`)
    } catch {
      toast.error('Trình duyệt không cho phép sao chép mã')
    }
  }

  const startCreate = () => {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setFormError('')
  }

  const startEdit = (voucher: Voucher) => {
    setEditingId(voucher.id)
    setDraft({
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      label: voucher.label,
      minOrder: String(voucher.minOrder),
      usageLimit: voucher.usageLimit == null ? '' : String(voucher.usageLimit),
      active: voucher.active,
      startsAt: asLocalDateTime(voucher.startsAt),
      expiresAt: asLocalDateTime(voucher.expiresAt),
    })
    setFormError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const value = Number(draft.value)
    const minOrder = Number(draft.minOrder)
    const usageLimit = draft.usageLimit.trim() ? Number(draft.usageLimit) : null
    if (!draft.code.trim() || !draft.label.trim()) return setFormError('Vui lòng nhập mã và mô tả voucher.')
    if (!Number.isFinite(value) || value < 0 || !Number.isFinite(minOrder) || minOrder < 0) {
      return setFormError('Giá trị voucher và đơn tối thiểu phải là số không âm.')
    }
    if (draft.type === 'percent' && (value <= 0 || value > 100)) {
      return setFormError('Voucher phần trăm phải nằm trong khoảng 1–100%.')
    }
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
      return setFormError('Giới hạn lượt dùng phải là số nguyên dương.')
    }

    const payload = {
      code: draft.code.trim().toUpperCase(),
      type: draft.type,
      value,
      label: draft.label.trim(),
      minOrder,
      usageLimit,
      active: draft.active,
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
    }

    setSaving(true)
    try {
      if (editingId) await api.put(`/vouchers/admin/${editingId}`, payload)
      else await api.post('/vouchers/admin', payload)
      toast.success(editingId ? 'Đã cập nhật voucher' : 'Đã tạo voucher')
      setEditingId(null)
      setDraft(EMPTY_DRAFT)
      await fetchVouchers()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Không thể lưu voucher.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (voucher: Voucher) => {
    if (!window.confirm(`Xóa voucher ${voucher.code}? Đơn hàng đã tạo vẫn giữ mã voucher trong lịch sử.`)) return
    try {
      await api.delete(`/vouchers/admin/${voucher.id}`)
      toast.success(`Đã xóa voucher ${voucher.code}`)
      await fetchVouchers()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xóa voucher'))
    }
  }

  const voucherCountText = useMemo(() => `${vouchers.length} voucher`, [vouchers.length])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mã giảm giá</h1>
          <p className="mt-0.5 text-sm text-gray-500">Quản lý voucher lưu trong PostgreSQL · {voucherCountText}</p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#1a73e8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1557b0]">
          <Plus size={16} /> Tạo voucher
        </button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{editingId ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}</h2>
          {editingId && <button type="button" onClick={startCreate} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><X size={15} /> Hủy sửa</button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <label className="text-sm font-medium text-gray-700">Mã voucher
            <input required maxLength={40} value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="VD: SALE10" className="mt-1 w-full rounded-lg border px-3 py-2 uppercase" />
          </label>
          <label className="text-sm font-medium text-gray-700">Loại voucher
            <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as VoucherType, value: e.target.value === 'freeship' ? '0' : d.value }))} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="percent">Giảm theo phần trăm</option>
              <option value="flat">Giảm số tiền cố định</option>
              <option value="freeship">Miễn phí vận chuyển</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Giá trị {draft.type === 'percent' ? '(%)' : '(đ)'}
            <input type="number" min={0} max={draft.type === 'percent' ? 100 : undefined} step={draft.type === 'percent' ? 1 : 1000} disabled={draft.type === 'freeship'} value={draft.value} onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100" />
          </label>
          <label className="text-sm font-medium text-gray-700 md:col-span-2">Mô tả
            <input required maxLength={160} value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="VD: Giảm 10% cho toàn bộ đơn hàng" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Đơn tối thiểu (đ)
            <input type="number" min={0} step={1000} value={draft.minOrder} onChange={(e) => setDraft((d) => ({ ...d, minOrder: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Giới hạn lượt dùng (để trống = không giới hạn)
            <input type="number" min={1} step={1} value={draft.usageLimit} onChange={(e) => setDraft((d) => ({ ...d, usageLimit: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Bắt đầu
            <input type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Kết thúc
            <input type="datetime-local" value={draft.expiresAt} onChange={(e) => setDraft((d) => ({ ...d, expiresAt: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 self-end rounded-lg border px-3 py-2 text-sm text-gray-700">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} className="accent-[#1a73e8]" /> Đang hoạt động
          </label>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1a73e8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
          {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo voucher'}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#1a73e8]" /></div>
      ) : vouchers.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500">Chưa có voucher nào. Hãy tạo mã giảm giá đầu tiên.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vouchers.map((voucher) => (
            <article key={voucher.id} className={`rounded-xl border-2 bg-white p-5 shadow-sm ${voucher.active ? 'border-gray-100' : 'border-gray-200 opacity-70'}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag size={18} className="shrink-0 text-[#1a73e8]" />
                  <span className="truncate font-mono text-lg font-bold tracking-wide">{voucher.code}</span>
                </div>
                <button type="button" onClick={() => void handleCopy(voucher.code)} className="text-gray-400 hover:text-[#1a73e8]" title="Sao chép mã"><Copy size={15} /></button>
              </div>
              <p className="mb-3 text-sm text-gray-700">{voucher.label}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-1 font-medium ${TYPE_COLOR[voucher.type]}`}>
                  {TYPE_LABEL[voucher.type]}{voucher.type === 'percent' ? ` — ${voucher.value}%` : voucher.type === 'flat' ? ` — ${voucher.value.toLocaleString('vi-VN')}đ` : ''}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Đơn từ {voucher.minOrder.toLocaleString('vi-VN')}đ</span>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Đã dùng {voucher.usedCount}{voucher.usageLimit == null ? '' : `/${voucher.usageLimit}`}</span>
                <span className={`rounded-full px-2 py-1 ${voucher.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{voucher.active ? 'Đang hoạt động' : 'Đã tắt'}</span>
              </div>
              <div className="mt-4 flex gap-2 border-t pt-3">
                <button type="button" onClick={() => startEdit(voucher)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Pencil size={13} /> Sửa</button>
                <button type="button" onClick={() => void handleDelete(voucher)} className="inline-flex items-center gap-1 rounded-md border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 size={13} /> Xóa</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminVouchers
