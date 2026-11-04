import { useState, useEffect, useCallback } from 'react'
import { Star, Check, Trash2, Search, Loader2, MessageSquare, AlertCircle } from 'lucide-react'
import api from '../../api/api'
import { useToast } from '../../components/Toast'

/**
 * Row `/admin/reviews` (legacy) khác với shared `Review` trong `types/index.ts`:
 * backend populate `userId` thành object và đính kèm `product`, trong khi shared
 * `Review.userId` chỉ là `string` và không có `product`. Định nghĩa row local tại biên fetch.
 */
type ReviewRow = {
  id: string
  _id?: string
  productId: string
  rating: number
  comment?: string | null
  isApproved?: boolean
  createdAt: string
  product?: { name?: string } | null
  userId?: { fullName?: string; email?: string; avatar?: string | null } | null
}

const STATUS_TABS = [
  { key: 'pending',  label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'all',      label: 'Tất cả' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} className={i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

function AdminReviews() {
  const toast = useToast()
  const [reviews, setReviews]       = useState<ReviewRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('pending')
  const [search, setSearch]         = useState('')
  const [actionId, setActionId]     = useState<string | null>(null) // id đang xử lý

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (tab !== 'all') params.approved = tab === 'approved' ? 'true' : 'false'
      if (search) params.search = search
      const res = await api.get<ReviewRow[]>('/admin/reviews', { params })
      setReviews(res.data || [])
    } catch {
      toast.error('Không thể tải danh sách đánh giá')
    } finally {
      setLoading(false)
    }
  }, [tab, search])

  useEffect(() => { fetchReviews() }, [fetchReviews])
  useEffect(() => { document.title = 'Quản lý đánh giá — Admin' }, [])

  const handleApprove = async (id: string) => {
    setActionId(id)
    try {
      await api.put(`/reviews/${id}/approve`)
      toast.success('Đã duyệt đánh giá')
      fetchReviews()
    } catch {
      toast.error('Duyệt thất bại')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xác nhận xóa đánh giá này?')) return
    setActionId(id)
    try {
      await api.delete(`/reviews/${id}`)
      toast.success('Đã xóa đánh giá')
      fetchReviews()
    } catch {
      toast.error('Xóa thất bại')
    } finally {
      setActionId(null)
    }
  }

  const pendingCount = reviews.filter(r => !r.isApproved).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý đánh giá</h1>
          <p className="text-sm text-gray-500 mt-0.5">Duyệt và quản lý review sản phẩm của khách hàng</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium">
            <AlertCircle size={16} />
            {pendingCount} đánh giá chờ duyệt
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên sản phẩm hoặc nội dung..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#1a73e8]" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p>Không có đánh giá nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map(r => (
              <div key={r._id || r.id} className="p-5 hover:bg-gray-50 transition">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {(r.userId?.fullName || 'K').charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-gray-800">{r.userId?.fullName || 'Khách'}</p>
                        <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.isApproved ? '✓ Đã duyệt' : '⏳ Chờ duyệt'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#1a73e8] mt-1 truncate">
                      Sản phẩm: {r.product?.name || r.productId}
                    </p>
                    <Stars rating={r.rating} />
                    <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{r.comment || <em className="text-gray-400">Không có nội dung</em>}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {!r.isApproved && (
                      <button onClick={() => handleApprove(r._id || r.id)}
                        disabled={actionId === (r._id || r.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition disabled:opacity-50">
                        {actionId === (r._id || r.id) ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                        Duyệt
                      </button>
                    )}
                    <button onClick={() => handleDelete(r._id || r.id)}
                      disabled={actionId === (r._id || r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-50">
                      <Trash2 size={13} /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminReviews
