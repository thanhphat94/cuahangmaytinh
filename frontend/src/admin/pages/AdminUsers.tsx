import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search, Eye, Shield, Mail, Phone,
  Calendar, X, Loader2, ChevronLeft, ChevronRight, Lock, Unlock, Trash2
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import { useToast } from '../../components/Toast'

/**
 * Row `/admin/users` (legacy Mongo) dùng `_id` làm khóa và được trang này đọc trực tiếp;
 * shared `User` trong `types/index.ts` lấy `id` làm khóa bắt buộc, nên khai báo row local.
 */
type AdminUserRow = {
  _id: string
  id?: string
  fullName: string
  email: string
  phone?: string | null
  role: string
  isActive?: boolean
  createdAt: string
}

function AdminUsers() {
  const toast = useToast()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const usersPerPage = 10

  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const searchParam = params.get('search')
    if (searchParam) setSearchQuery(searchParam)
  }, [location.search])

  // Chờ người dùng gõ xong rồi mới gọi API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Đổi bộ lọc → quay về trang 1
  useEffect(() => { setCurrentPage(1) }, [roleFilter, debouncedSearch])

  // Lọc vai trò + tìm kiếm làm ở BACKEND (trước đây chỉ lọc trong trang đang xem nên "Khách hàng" ra rỗng)
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ users: AdminUserRow[]; totalPages: number; total: number }>('/admin/users', {
        params: {
          page: currentPage,
          limit: usersPerPage,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          search: debouncedSearch || undefined,
        }
      })
      setUsers(res.data.users)
      setTotalPages(res.data.totalPages)
      setTotalUsers(res.data.total)
    } catch {
      toast.error('Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, roleFilter, debouncedSearch])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Xoá VĨNH VIỄN tài khoản (backend chặn xoá admin, tự xoá mình và khách còn đơn chưa hoàn tất)
  const deleteUser = async (user: AdminUserRow) => {
    const ok = window.confirm(
      `XOÁ VĨNH VIỄN tài khoản "${user.fullName}" (${user.email})?\n\n` +
      'Giỏ hàng, yêu thích, đánh giá và địa chỉ của tài khoản sẽ bị xoá và KHÔNG thể khôi phục.\n' +
      'Các đơn hàng cũ vẫn được giữ lại để đối soát.\n\n' +
      'Nếu chỉ muốn tạm ngưng, hãy chọn "Khoá tài khoản" thay vì xoá.'
    )
    if (!ok) return
    setTogglingId(user._id)
    try {
      await api.delete(`/admin/users/${user._id}`)
      toast.success('Đã xoá tài khoản người dùng')
      setSelectedUser((cur) => (cur && cur._id === user._id ? null : cur))
      // Xoá phần tử cuối của trang cuối thì lùi về trang trước
      if (users.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1)
      else fetchUsers()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xoá tài khoản thất bại'))
    } finally {
      setTogglingId(null)
    }
  }

  // Khoá tạm thời / mở khoá tài khoản (không xoá dữ liệu của khách)
  const toggleStatus = async (user: AdminUserRow) => {
    const locking = user.isActive !== false
    const ok = window.confirm(
      locking
        ? `Khoá tài khoản "${user.fullName}"?\nNgười này sẽ không đăng nhập và đặt hàng bằng tài khoản được nữa cho đến khi bạn mở khoá.`
        : `Mở khoá tài khoản "${user.fullName}"?`
    )
    if (!ok) return
    setTogglingId(user._id)
    try {
      await api.put(`/admin/users/${user._id}/toggle`)
      toast.success(locking ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản')
      fetchUsers()
      setSelectedUser((cur) => (cur && cur._id === user._id ? { ...cur, isActive: !locking } : cur))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Thay đổi trạng thái thất bại'))
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = users

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8] w-64"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng người dùng', value: totalUsers },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-10">
              <Loader2 className="animate-spin text-[#1a73e8]" size={32} />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Người dùng</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Liên hệ</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Vai trò</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      Không tìm thấy người dùng nào
                    </td>
                  </tr>
                ) : (
                  filtered.map(user => (
                    <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#1a73e8] rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-left">{user.fullName || 'No Name'}</p>
                            <p className="text-xs text-gray-500 text-left">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <p className="text-sm flex items-center gap-1"><Mail size={12} className="text-gray-400" /> {user.email}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12} className="text-gray-400" /> {user.phone || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Khách hàng'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive !== false
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {user.isActive !== false ? 'Hoạt động' : 'Đã khoá'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-1.5 text-gray-400 hover:text-[#1a73e8] hover:bg-blue-50 rounded transition"
                            title="Chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => toggleStatus(user)}
                              disabled={togglingId === user._id}
                              className={`p-1.5 rounded transition disabled:opacity-50 ${
                                user.isActive !== false
                                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                  : 'text-red-500 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={user.isActive !== false ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                            >
                              {togglingId === user._id
                                ? <Loader2 size={16} className="animate-spin" />
                                : user.isActive !== false ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                          )}
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => deleteUser(user)}
                              disabled={togglingId === user._id}
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                              title="Xoá tài khoản vĩnh viễn"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Trang {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                    currentPage === i + 1
                      ? 'bg-[#1a73e8] text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-md cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800">Chi tiết người dùng</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#1a73e8] rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {selectedUser.fullName ? selectedUser.fullName[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{selectedUser.fullName || 'No Name'}</h4>
                  <p className="text-gray-500 text-sm">{selectedUser.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedUser.role === 'admin' ? 'Admin' : 'Khách hàng'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {selectedUser.phone || 'N/A'}</p>
                <p className="text-sm flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> Tham gia: {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</p>
                <p className="text-sm flex items-center gap-2"><Shield size={14} className="text-gray-400" /> Trạng thái: {selectedUser.isActive !== false ? 'Hoạt động' : 'Đã khoá'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              {selectedUser.role !== 'admin' && (
                <button
                  onClick={() => toggleStatus(selectedUser)}
                  disabled={togglingId === selectedUser._id}
                  className={`px-4 py-2 rounded-lg border transition disabled:opacity-50 ${
                    selectedUser.isActive !== false
                      ? 'border-red-300 text-red-600 hover:bg-red-50'
                      : 'border-green-300 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {selectedUser.isActive !== false ? 'Khoá tài khoản' : 'Mở khoá'}
                </button>
              )}
              {selectedUser.role !== 'admin' && (
                <button
                  onClick={() => deleteUser(selectedUser)}
                  disabled={togglingId === selectedUser._id}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  Xoá tài khoản
                </button>
              )}
              <button 
                onClick={() => setSelectedUser(null)} 
                className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AdminUsers
