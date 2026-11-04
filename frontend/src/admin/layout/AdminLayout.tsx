import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAppDispatch } from '../../redux/hooks'
import { logout } from '../../redux/slices/authSlice'
import { adminService } from '../../services/adminService'
import type { AdminNotification } from '../../services/adminService'
import { useToast } from '../../components/Toast'
import {
  LayoutDashboard, Package, ShoppingCart, Users, FolderTree,
  Newspaper, Settings, LogOut, Menu, X, ChevronRight, Bell, MessageSquare, Tag,
  Search, Eye, FileText, Mail
} from 'lucide-react'


type NotificationPreferences = { readIds: string[]; dismissedIds: string[] }
const NOTIFICATION_PREFERENCES_KEY = 'cuahangmaytinh_admin_notification_preferences_v1'

const readNotificationPreferences = (): NotificationPreferences => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(NOTIFICATION_PREFERENCES_KEY) || '{}')
    if (!raw || typeof raw !== 'object') return { readIds: [], dismissedIds: [] }
    const value = raw as Partial<NotificationPreferences>
    return {
      readIds: Array.isArray(value.readIds) ? value.readIds.filter((id): id is string => typeof id === 'string') : [],
      dismissedIds: Array.isArray(value.dismissedIds) ? value.dismissedIds.filter((id): id is string => typeof id === 'string') : [],
    }
  } catch {
    return { readIds: [], dismissedIds: [] }
  }
}

const writeNotificationPreferences = (value: NotificationPreferences): void => {
  try {
    localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify({
      // Giữ giới hạn để localStorage không tăng vô hạn theo thời gian.
      readIds: value.readIds.slice(-500),
      dismissedIds: value.dismissedIds.slice(-500),
    }))
  } catch { /* trình duyệt có thể chặn localStorage; thông báo vẫn hoạt động trong phiên hiện tại */ }
}

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Tổng quan' },
  { path: '/admin/products', icon: Package, label: 'Sản phẩm' },
  { path: '/admin/orders', icon: ShoppingCart, label: 'Đơn hàng' },
  { path: '/admin/users', icon: Users, label: 'Người dùng' },
  { path: '/admin/categories', icon: FolderTree, label: 'Danh mục' },
  { path: '/admin/news', icon: Newspaper, label: 'Tin tức' },
  { path: '/admin/reviews',  icon: MessageSquare, label: 'Đánh giá' },
  { path: '/admin/contacts', icon: Mail,          label: 'Liên hệ' },
  { path: '/admin/vouchers', icon: Tag,           label: 'Voucher' },
  { path: '/admin/price-lists', icon: FileText,   label: 'Bảng giá' },
  { path: '/admin/settings', icon: Settings,      label: 'Cài đặt' },
]

function AdminLayout() {
  const toast = useToast()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(readNotificationPreferences)

  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const userDropdownRef = useRef<HTMLDivElement | null>(null)
  const pageContentRef = useRef<HTMLElement | null>(null)

  // Khu vực nội dung Admin tự cuộn (overflow-y-auto), nên phải reset riêng.
  useLayoutEffect(() => {
    if (pageContentRef.current) {
      pageContentRef.current.scrollTop = 0
      pageContentRef.current.scrollLeft = 0
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    adminService.getNotifications()
      .then(({ data }) => {
        const preferences = readNotificationPreferences()
        setNotificationPreferences(preferences)
        const dismissed = new Set(preferences.dismissedIds)
        const read = new Set(preferences.readIds)
        setNotifications(data
          .filter((notification) => !dismissed.has(notification.id))
          .map((notification) => ({ ...notification, read: notification.read || read.has(notification.id) })))
      })
      .catch(() => setNotifications([]))
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    setIsUserDropdownOpen(false)
    dispatch(logout())
    navigate('/admin/login')
  }

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      toast.info(`Tìm kiếm: "${searchQuery}" — đang chuyển hướng...`)
      navigate(`/admin/products?search=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  const persistPreferences = (next: NotificationPreferences) => {
    setNotificationPreferences(next)
    writeNotificationPreferences(next)
  }

  const handleMarkAllRead = () => {
    const next = {
      ...notificationPreferences,
      readIds: Array.from(new Set([...notificationPreferences.readIds, ...notifications.map((n) => n.id)])),
    }
    persistPreferences(next)
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.read) {
      persistPreferences({
        ...notificationPreferences,
        readIds: Array.from(new Set([...notificationPreferences.readIds, notification.id])),
      })
      setNotifications((current) => current.map((n) => n.id === notification.id ? { ...n, read: true } : n))
    }
    setIsNotificationsOpen(false)
    if (notification.link) navigate(notification.link)
  }

  const deleteNotification = (id: string, e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    persistPreferences({
      ...notificationPreferences,
      dismissedIds: Array.from(new Set([...notificationPreferences.dismissedIds, id])),
    })
    setNotifications((current) => current.filter((n) => n.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Desktop */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#1a1a2e] text-white transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff6b00] rounded-lg flex items-center justify-center shrink-0">
              <span className="font-bold text-sm">A</span>
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-lg whitespace-nowrap">Admin</span>
            )}
          </Link>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:block p-1 hover:bg-gray-700 rounded transition"
          >
            <ChevronRight
              size={18}
              className={`transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Menu */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  active
                    ? 'bg-[#ff6b00] text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <Icon size={20} className="shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <Eye size={20} />
            {isSidebarOpen && <span className="text-sm font-medium">Xem website</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition mt-1"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-800">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Admin'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <button type="submit" className="focus:outline-none">
                <Search size={16} className="text-gray-400 hover:text-[#1a73e8] transition" />
              </button>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm ml-2 w-48"
              />
            </form>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen)
                  setIsUserDropdownOpen(false)
                }}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-800">Thông báo</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-xs text-[#1a73e8] hover:underline"
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        Không có thông báo nào
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-start gap-2 cursor-pointer transition ${
                            !n.read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="space-y-0.5 text-left">
                            <p className={`text-xs ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{n.text}</p>
                            <p className="text-[10px] text-gray-400">{n.time}</p>
                          </div>
                          <button 
                            onClick={(e) => deleteNotification(n.id, e)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded transition"
                            title="Xóa"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              <button 
                onClick={() => {
                  setIsUserDropdownOpen(!isUserDropdownOpen)
                  setIsNotificationsOpen(false)
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="w-8 h-8 bg-[#1a73e8] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  A
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">Admin</span>
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 text-left">
                    <p className="text-sm font-bold text-gray-800">Quản trị viên</p>
                    <p className="text-xs text-gray-400 truncate">admin@cuahangmaytinh.vn</p>
                  </div>
                  <Link 
                    to="/admin/settings" 
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Settings size={16} className="text-gray-400" />
                    Cài đặt hệ thống
                  </Link>
                  <button 
                    onClick={() => {
                      setIsUserDropdownOpen(false)
                      toast.info("Tính năng cập nhật hồ sơ cá nhân đang phát triển")
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
                  >
                    <Users size={16} className="text-gray-400" />
                    Hồ sơ cá nhân
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left"
                  >
                    <LogOut size={16} className="text-red-400" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main ref={pageContentRef} className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
