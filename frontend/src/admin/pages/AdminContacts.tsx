import { useState, useEffect, useCallback, useMemo } from 'react'
import { Mail, Phone, Search, Loader2, Trash2, CheckCheck, Inbox, Reply, Clock, Send, X } from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import { useToast } from '../../components/Toast'

/** Một liên hệ khách gửi từ trang "Liên hệ" — `GET /api/contacts` (chỉ admin). */
type ContactRow = {
  id: string
  _id?: string
  fullName: string
  email: string
  phone?: string | null
  message: string
  isRead: boolean
  userId?: string | null
  reply?: string | null
  repliedAt?: string | null
  createdAt: string
}

const TABS = [
  { key: 'all',    label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
  { key: 'read',   label: 'Đã đọc' },
]

function AdminContacts() {
  const toast = useToast()
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ContactRow[]>('/contacts')
      setContacts(res.data || [])
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải danh sách liên hệ'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])
  useEffect(() => { document.title = 'Liên hệ của khách — Admin' }, [])

  const unreadCount = contacts.filter((c) => !c.isRead).length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts.filter((c) => {
      if (tab === 'unread' && c.isRead) return false
      if (tab === 'read' && !c.isRead) return false
      if (!q) return true
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        c.message.toLowerCase().includes(q)
      )
    })
  }, [contacts, tab, search])

  const markRead = async (id: string) => {
    setBusyId(id)
    try {
      await api.put(`/contacts/${id}/read`)
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, isRead: true } : c)))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể đánh dấu đã đọc'))
    } finally {
      setBusyId(null)
    }
  }

  const openReply = (c: ContactRow) => {
    setReplyingId(c.id)
    setReplyText(c.reply ?? '')
    if (!c.isRead) markRead(c.id)
  }

  const submitReply = async (id: string) => {
    if (replyText.trim().length < 2) { toast.warning('Vui lòng nhập nội dung trả lời'); return }
    setBusyId(id)
    try {
      const res = await api.put<ContactRow>(`/contacts/${id}/reply`, { reply: replyText.trim() })
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, reply: res.data.reply, repliedAt: res.data.repliedAt, isRead: true } : c)))
      setReplyingId(null)
      setReplyText('')
      toast.success('Đã gửi câu trả lời')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể gửi câu trả lời'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Xoá liên hệ này?')) return
    setBusyId(id)
    try {
      await api.delete(`/contacts/${id}`)
      setContacts((prev) => prev.filter((c) => c.id !== id))
      toast.success('Đã xoá liên hệ')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xoá thất bại'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Liên hệ của khách</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tin nhắn khách gửi từ trang "Liên hệ" trên website</p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium">
            <Inbox size={16} /> {unreadCount} liên hệ chưa đọc
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, số điện thoại hoặc nội dung..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#1a73e8]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Inbox size={48} className="mx-auto mb-3 opacity-30" />
            <p>{contacts.length === 0 ? 'Chưa có liên hệ nào từ khách hàng' : 'Không có liên hệ phù hợp'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <div key={c.id} className={`p-5 transition ${c.isRead ? 'bg-white' : 'bg-blue-50/40'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1a73e8] text-white font-bold flex items-center justify-center shrink-0">
                    {(c.fullName || 'K').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{c.fullName}</p>
                      {!c.isRead && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1a73e8] text-white font-medium">Mới</span>
                      )}
                      {c.reply && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Đã trả lời</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1"><Mail size={13} /> {c.email}</span>
                      {c.phone && <span className="flex items-center gap-1"><Phone size={13} /> {c.phone}</span>}
                      <span className="flex items-center gap-1"><Clock size={13} /> {new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-3 whitespace-pre-line break-words leading-relaxed">{c.message}</p>

                    {c.reply && replyingId !== c.id && (
                      <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-xs text-green-700 font-medium mb-1">
                          Câu trả lời của bạn{c.repliedAt ? ` · ${new Date(c.repliedAt).toLocaleString('vi-VN')}` : ''}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-line break-words leading-relaxed">{c.reply}</p>
                      </div>
                    )}

                    {replyingId === c.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={4}
                          autoFocus
                          placeholder="Nhập câu trả lời cho khách..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 resize-none"
                        />
                        <p className="text-xs text-gray-400">
                          {c.userId
                            ? 'Khách sẽ thấy câu trả lời này trong Tài khoản → Liên hệ của tôi.'
                            : <>Khách gửi khi chưa đăng nhập, nên có thể không xem được trên website. <a className="text-[#1a73e8] hover:underline" href={`mailto:${c.email}?subject=${encodeURIComponent('Phản hồi liên hệ từ Cửa Hàng Máy Tính')}&body=${encodeURIComponent(replyText)}`}>Gửi thêm qua email</a></>}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitReply(c.id)}
                            disabled={busyId === c.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] text-white rounded-lg text-xs font-medium hover:bg-[#1557b0] transition disabled:opacity-50"
                          >
                            {busyId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Gửi trả lời
                          </button>
                          <button
                            onClick={() => { setReplyingId(null); setReplyText('') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                          >
                            <X size={13} /> Huỷ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openReply(c)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] text-white rounded-lg text-xs font-medium hover:bg-[#1557b0] transition"
                    >
                      <Reply size={13} /> {c.reply ? 'Sửa trả lời' : 'Trả lời'}
                    </button>
                    {!c.isRead && (
                      <button
                        onClick={() => markRead(c.id)}
                        disabled={busyId === c.id}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition disabled:opacity-50"
                      >
                        <CheckCheck size={13} /> Đã đọc
                      </button>
                    )}
                    <button
                      onClick={() => remove(c.id)}
                      disabled={busyId === c.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Xoá
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

export default AdminContacts
