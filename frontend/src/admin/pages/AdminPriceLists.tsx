import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import type { PriceList } from '../../types'
import { useToast } from '../../components/Toast'

const formatSize = (bytes: number): string => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

// Admin: upload / xoá bảng giá (chỉ admin đăng nhập mới vào được trang này)
function AdminPriceLists() {
  const toast = useToast()
  const [items, setItems] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const load = () =>
    api.get<PriceList[]>('/price-lists').then(r => setItems(r.data)).catch(() => toast.error('Không tải được danh sách bảng giá')).finally(() => setLoading(false))

  useEffect(() => { document.title = 'Quản lý bảng giá — Admin'; load() }, [])

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) return toast.error('Vui lòng chọn file bảng giá')
    const form = new FormData()
    form.append('title', title)
    form.append('file', file)
    setUploading(true)
    try {
      await api.post('/price-lists', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Đã upload bảng giá')
      setTitle(''); setFile(null); e.currentTarget.reset()
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload thất bại'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xoá bảng giá này?')) return
    try {
      await api.delete(`/price-lists/${id}`)
      toast.success('Đã xoá')
      load()
    } catch {
      toast.error('Xoá thất bại')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Bảng giá sản phẩm</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload file PDF / Excel / Word (tối đa 10MB). Khách tải tại trang /bang-gia</p>
      </div>

      <form onSubmit={handleUpload} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề (không bắt buộc)</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Bảng giá tháng 11/2026"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File bảng giá</label>
          <input type="file" accept=".pdf,.xls,.xlsx,.csv,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
        <button type="submit" disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] disabled:opacity-60">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload
        </button>
      </form>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-100">
        {loading ? (
          <p className="p-6 text-center text-gray-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-gray-400">Chưa có bảng giá nào</p>
        ) : items.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-4">
            <FileText className="text-[#1a73e8]" size={24} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{item.title}</p>
              <p className="text-xs text-gray-500">{item.originalName} · {formatSize(item.size)} · {new Date(item.createdAt).toLocaleString('vi-VN')}</p>
            </div>
            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Xoá"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminPriceLists
