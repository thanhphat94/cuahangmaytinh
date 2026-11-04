import { useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, X, Loader2, Newspaper } from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import { useToast } from '../../components/Toast'
import type { Post } from '../../types'

/**
 * Trang này trước đây lưu bài trong state của trình duyệt (mất khi F5, không có ở trang khách).
 * Giờ đọc/ghi thật qua `/api/admin/posts` (bảng Post trong database).
 */
function AdminNews() {
  const toast = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Post | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Post[]>('/admin/posts')
      setPosts(res.data || [])
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải danh sách tin tức'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const closeModal = () => { setShowModal(false); setEditing(null) }

  // Nhập các tin mẫu (bài đã có cùng tiêu đề sẽ được bỏ qua)
  const handleSeedSamples = async () => {
    setSeeding(true)
    try {
      const res = await api.post<{ created: number; total: number }>('/admin/posts/seed-samples')
      toast.success(res.data.created > 0 ? `Đã nhập ${res.data.created} tin mẫu` : 'Các tin mẫu đã có sẵn')
      await fetchPosts()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Nhập tin mẫu thất bại'))
    } finally {
      setSeeding(false)
    }
  }

  const handleDelete = async (post: Post) => {
    if (!window.confirm(`Xoá bài "${post.title}"?`)) return
    setBusyId(post.id)
    try {
      await api.delete(`/admin/posts/${post.id}`)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      toast.success('Đã xoá bài viết')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xoá thất bại'))
    } finally {
      setBusyId(null)
    }
  }

  const toggleStatus = async (post: Post) => {
    setBusyId(post.id)
    try {
      const res = await api.put<Post>(`/admin/posts/${post.id}`, { isActive: !post.isActive })
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...res.data } : p)))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Đổi trạng thái thất bại'))
    } finally {
      setBusyId(null)
    }
  }

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const content = String(form.get('content') ?? '')
    const thumbnail = String(form.get('thumbnail') ?? '').trim()
    const isActive = String(form.get('status') ?? 'published') === 'published'

    if (!title) {
      toast.warning('Vui lòng nhập tiêu đề bài viết')
      return
    }

    setSaving(true)
    try {
      const body = { title, content, thumbnail: thumbnail || null, isActive }
      if (editing) {
        const res = await api.put<Post>(`/admin/posts/${editing.id}`, body)
        setPosts((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...res.data } : p)))
        toast.success('Đã lưu thay đổi')
      } else {
        const res = await api.post<Post>('/admin/posts', body)
        setPosts((prev) => [res.data, ...prev])
        toast.success(isActive ? 'Đã đăng bài viết' : 'Đã lưu bản nháp')
      }
      closeModal()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Lưu bài viết thất bại'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Quản lý tin tức</h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
        >
          <Plus size={18} />
          Viết tin mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-[#1a73e8]" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Newspaper size={48} className="mx-auto mb-3 opacity-30" />
            <p>Chưa có bài viết nào. Bấm "Viết tin mới" để đăng bài đầu tiên.</p>
            <button
              onClick={handleSeedSamples}
              disabled={seeding}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-[#1a73e8] text-[#1a73e8] rounded-lg hover:bg-blue-50 transition disabled:opacity-60"
            >
              {seeding && <Loader2 size={16} className="animate-spin" />}
              Nhập các tin mẫu
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tiêu đề</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ngày tạo</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {post.thumbnail ? (
                          <img src={post.thumbnail} alt="" className="w-12 h-12 object-cover rounded-lg bg-gray-100 shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Newspaper size={20} className="text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0 text-left">
                          <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                          <p className="text-xs text-gray-400">/tin-tuc/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-500">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleStatus(post)}
                        disabled={busyId === post.id}
                        title="Bấm để đổi trạng thái"
                        className={`px-2 py-1 rounded-full text-xs font-medium transition disabled:opacity-50 ${
                          post.isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {post.isActive ? 'Đã đăng' : 'Bản nháp'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {post.isActive ? (
                          <a
                            href={`/tin-tuc/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Xem trên website"
                            className="p-1.5 text-gray-400 hover:text-[#1a73e8] hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={16} />
                          </a>
                        ) : (
                          <span title="Bản nháp chưa hiển thị trên website" className="p-1.5 text-gray-300 cursor-not-allowed">
                            <EyeOff size={16} />
                          </span>
                        )}
                        <button
                          onClick={() => { setEditing(post); setShowModal(true) }}
                          className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded transition"
                          title="Sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          disabled={busyId === post.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                          title="Xoá"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800">{editing ? 'Sửa tin' : 'Viết tin mới'}</h3>
              <button type="button" onClick={closeModal} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>

            <div className="p-4 space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                <input name="title" type="text" required defaultValue={editing?.title || ''}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link ảnh đại diện</label>
                  <input name="thumbnail" type="url" placeholder="https://..." defaultValue={editing?.thumbnail || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select name="status" defaultValue={editing ? (editing.isActive ? 'published' : 'draft') : 'published'}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]">
                    <option value="published">Đăng ngay</option>
                    <option value="draft">Lưu nháp</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                <textarea name="content" rows={10} defaultValue={editing?.content || ''}
                  placeholder={'Mỗi dòng là một đoạn.\n## Tiêu đề nhỏ (dòng bắt đầu bằng ##)\n- Gạch đầu dòng (dòng bắt đầu bằng dấu -)'}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8] resize-y" />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Hủy</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editing ? 'Lưu thay đổi' : 'Đăng tin'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminNews
