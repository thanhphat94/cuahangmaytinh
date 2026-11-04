import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, MessageSquare, Clock, CheckCircle } from 'lucide-react'
import api, { getErrorMessage } from '../api/api'

/** Liên hệ của chính người dùng — `GET /api/contacts/my`. */
type MyContact = {
  id: string
  message: string
  reply?: string | null
  repliedAt?: string | null
  createdAt: string
}

function MyContacts() {
  const [items, setItems] = useState<MyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<MyContact[]>('/contacts/my')
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(getErrorMessage(err, 'Không thể tải liên hệ của bạn')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-[#1a73e8]" /></div>
  if (error) return <p className="text-sm text-red-500">{error}</p>

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Bạn chưa gửi liên hệ nào.</p>
        <Link to="/contact" className="inline-block mt-3 text-sm text-[#1a73e8] hover:underline">Gửi liên hệ ngay</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((c) => (
        <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(c.createdAt).toLocaleString('vi-VN')}</span>
            {c.reply
              ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đã trả lời</span>
              : <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Đang chờ phản hồi</span>}
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-line break-words leading-relaxed">{c.message}</p>
          {c.reply && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                <CheckCircle size={12} /> Phản hồi từ cửa hàng{c.repliedAt ? ` · ${new Date(c.repliedAt).toLocaleString('vi-VN')}` : ''}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-line break-words leading-relaxed">{c.reply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default MyContacts
