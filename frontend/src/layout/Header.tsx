import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Search, ShoppingCart, Phone, Menu, X, ChevronDown, ChevronRight,
  User, Heart, Camera, Monitor, Cpu, Printer, Wifi, Headphones,
  LogOut, Package, LayoutDashboard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { logout } from '../redux/slices/authSlice'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { CATEGORIES } from '../utils/constants'

// ─── Icon map ────────────────────────────────────────────────
const iconMap: Record<string, LucideIcon> = { Camera, Monitor, Cpu, Printer, Wifi, Headphones }

// ─── Sub-categories cho từng danh mục ────────────────────────
// slug dùng đúng slug DB + query params để lọc trong CategoryPage
interface SubCategoryItem {
  name: string
  slug: string
}

const SUBCATEGORIES: Record<string, SubCategoryItem[]> = {
  'camera-quan-sat': [
    { name: 'Camera IP / Dome', slug: 'camera-quan-sat?type=ip' },
    { name: 'Camera PTZ', slug: 'camera-quan-sat?type=ptz' },
    { name: 'Camera WiFi', slug: 'camera-quan-sat?type=wifi' },
    { name: 'Đầu ghi hình NVR / DVR', slug: 'camera-quan-sat?type=nvr' },
    { name: 'Hãng Hikvision', slug: 'camera-quan-sat?brand=Hikvision' },
    { name: 'Hãng Dahua', slug: 'camera-quan-sat?brand=Dahua' },
    { name: 'Hãng Ezviz / Imou', slug: 'camera-quan-sat?brand=Ezviz' },
    { name: 'Hãng Uniarch', slug: 'camera-quan-sat?brand=Uniarch' },
  ],
  'may-tinh-pc': [
    { name: 'Máy tính bộ (Desktop)', slug: 'may-tinh-pc?type=desktop' },
    { name: 'Mini PC', slug: 'may-tinh-pc?type=mini-pc' },
    { name: 'Workstation', slug: 'may-tinh-pc?type=workstation' },
    { name: 'Hãng Dell', slug: 'may-tinh-pc?brand=Dell' },
    { name: 'Hãng HP', slug: 'may-tinh-pc?brand=HP' },
    { name: 'Hãng ASUS', slug: 'may-tinh-pc?brand=ASUS' },
    { name: 'Hãng MSI', slug: 'may-tinh-pc?brand=MSI' },
  ],
  'may-in': [
    { name: 'Máy in laser đen trắng', slug: 'may-in?type=laser-bw' },
    { name: 'Máy in đa năng', slug: 'may-in?type=multifunction' },
    { name: 'Máy in 2 mặt', slug: 'may-in?type=laser-bw' },
    { name: 'Hãng Pantum', slug: 'may-in?brand=Pantum' },
    { name: 'Hãng HP', slug: 'may-in?brand=HP' },
    { name: 'Hãng Canon', slug: 'may-in?brand=Canon' },
    { name: 'Hãng Brother', slug: 'may-in?brand=Brother' },
  ],
}

// ─── Component ────────────────────────────────────────────────
function Header() {
  const { settings } = useSiteSettings()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)
  const { totalItems, setIsCartOpen } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Trạng thái đăng nhập (lấy từ Redux, đã được lưu qua F5 bằng localStorage) ──
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const userInitial = (user?.fullName || user?.email || 'U').trim().charAt(0).toUpperCase()

  // ── Header chuyển relative → fixed khi cuộn. Giữ một khối đệm cùng chiều cao để trang
  //    KHÔNG bị co lại (nguyên nhân gây giật ở trang ngắn như trang kết quả cuối). ──
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const scrolledRef = useRef(false)
  const [spacerHeight, setSpacerHeight] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      if (!scrolledRef.current && y > 100) {
        scrolledRef.current = true
        setSpacerHeight(wrapRef.current?.offsetHeight ?? 0)
        setIsScrolled(true)
      } else if (scrolledRef.current && y <= 40) {
        // Ngưỡng thoát thấp hơn ngưỡng vào (100 vs 40) để không nhấp nháy qua lại
        scrolledRef.current = false
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
    setIsUserMenuOpen(false)
  }, [location])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleLogout = () => {
    setIsUserMenuOpen(false)
    setIsMenuOpen(false)
    dispatch(logout())
    navigate('/')
  }

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  // Giữ dropdown mở khi di chuyển sang panel phải
  const handleDropdownEnter = () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    setIsCategoryOpen(true)
  }
  const handleDropdownLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsCategoryOpen(false)
      setHoveredCat(null)
    }, 120)
  }

  // Lấy sub-categories theo slug DB
  const subcats = hoveredCat ? (SUBCATEGORIES[hoveredCat] || []) : []

  return (
    <div ref={wrapRef} style={isScrolled ? { height: spacerHeight } : undefined}>
    <header
      className={`w-full ${
        isScrolled ? 'fixed top-0 left-0 right-0 z-50 shadow-lg' : 'relative'
      }`}
    >
      {/* Top bar */}
      <div className="bg-[#1a73e8] text-white py-2">
        <div className="container flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone size={14} />
              Hotline: {settings.hotline}
            </span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">
              Miễn phí vận chuyển đơn từ{' '}
              {new Intl.NumberFormat('vi-VN').format(settings.freeShippingFrom / 1000)}K
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link to="/account" className="hover:text-yellow-300 transition font-medium">
                Xin chào, {user.fullName}
              </Link>
            ) : (
              <Link to="/login" className="hover:text-yellow-300 transition">Tài khoản</Link>
            )}
            <Link to="/orders" className="hover:text-yellow-300 transition">Đơn hàng</Link>
            <Link to="/contact" className="hover:text-yellow-300 transition">Liên hệ</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-white py-3 shadow-sm">
        <div className="container flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 flex items-center justify-center bg-gray-900 border border-gray-800 shadow-sm overflow-hidden">
              <img src="/images/logodoan2-icon.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-[#1a73e8] leading-tight">
                {settings.storeName.toUpperCase()}
              </h1>
              <p className="text-xs text-gray-500">{settings.tagline}</p>
            </div>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 border-2 border-[#1a73e8] rounded-lg focus:outline-none focus:border-[#ff6b00]"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-4 bg-[#1a73e8] text-white rounded-r-lg hover:bg-[#1557b0] transition"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/wishlist" className="p-2 hover:bg-gray-100 rounded-lg transition hidden sm:block">
              <Heart size={22} className="text-gray-600" />
            </Link>
            {user ? (
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Menu tài khoản"
                  aria-expanded={isUserMenuOpen}
                >
                  <span className="w-8 h-8 rounded-full bg-[#1a73e8] text-white text-sm font-bold flex items-center justify-center">
                    {userInitial}
                  </span>
                  <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                  <ChevronDown size={14} className="hidden lg:block text-gray-400" />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-semibold text-gray-800 truncate">{user.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link to="/account" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={16} className="text-gray-400" /> Tài khoản của tôi
                    </Link>
                    <Link to="/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Package size={16} className="text-gray-400" /> Đơn hàng của tôi
                    </Link>
                    <Link to="/wishlist" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Heart size={16} className="text-gray-400" /> Sản phẩm yêu thích
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <LayoutDashboard size={16} className="text-gray-400" /> Trang quản trị
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="p-2 hover:bg-gray-100 rounded-lg transition hidden sm:block" aria-label="Đăng nhập">
                <User size={22} className="text-gray-600" />
              </Link>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ShoppingCart size={22} className="text-gray-600" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff6b00] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-[#1a1a2e] text-white hidden md:block">
        <div className="container">
          <div className="flex items-center">
            {/* ── Categories mega-dropdown ─────────────────────── */}
            <div
              className="relative"
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
            >
              <button className="flex items-center gap-2 px-6 py-3 bg-[#ff6b00] font-medium hover:bg-[#e55d00] transition">
                <Menu size={20} />
                DANH MỤC SẢN PHẨM
                <ChevronDown size={16} />
              </button>

              {isCategoryOpen && (
                <div className="absolute top-full left-0 flex shadow-2xl z-50 rounded-b-lg overflow-hidden">
                  {/* Cột danh mục chính */}
                  <div className="w-56 bg-white border-r border-gray-100">
                    {CATEGORIES.map((cat) => {
                      const Icon = iconMap[cat.icon] || Camera
                      const isHovered = hoveredCat === cat.slug
                      return (
                        <div
                          key={cat.id}
                          onMouseEnter={() => setHoveredCat(cat.slug)}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${
                            isHovered
                              ? 'bg-[#1a73e8] text-white'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-[#1a73e8]'
                          }`}
                        >
                          <Link
                            to={`/category/${cat.slug}`}
                            className="flex items-center gap-3 flex-1"
                            onClick={() => setIsCategoryOpen(false)}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isHovered ? 'bg-white/20' : 'bg-[#1a73e8]/10'
                              }`}
                            >
                              <Icon
                                size={16}
                                className={isHovered ? 'text-white' : 'text-[#1a73e8]'}
                              />
                            </div>
                            <span className="font-medium text-sm">{cat.name}</span>
                          </Link>
                          {(SUBCATEGORIES[cat.slug]?.length ?? 0) > 0 && (
                            <ChevronRight
                              size={14}
                              className={isHovered ? 'text-white' : 'text-gray-400'}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Cột sub-categories bên phải */}
                  {subcats.length > 0 && (
                    <div className="w-64 bg-white">
                      <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        Xem theo loại
                      </div>
                      {subcats.map((sub, i) => {
                        // sub.slug có thể là "camera-quan-sat?type=ip" => cần split
                        const [catSlug, qs] = sub.slug.split('?')
                        const toPath = qs ? `/category/${catSlug}?${qs}` : `/category/${catSlug}`
                        return (
                          <Link
                            key={i}
                            to={toPath}
                            onClick={() => setIsCategoryOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#1a73e8]/5 hover:text-[#1a73e8] transition border-b border-gray-50"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] shrink-0" />
                            {sub.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main nav links */}
            <div className="flex items-center ml-6">
              <Link to="/" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">TRANG CHỦ</Link>
              <Link to="/category/camera-quan-sat" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">CAMERA</Link>
              <Link to="/category/laptop" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">LAPTOP</Link>
              <Link to="/category/may-tinh-pc" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">MÁY TÍNH</Link>
              <Link to="/category/may-in" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">MÁY IN</Link>
              <Link to="/khuyen-mai" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">KHUYẾN MÃI</Link>
              <Link to="/bang-gia" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">BẢNG GIÁ</Link>
              <Link to="/tin-tuc" className="px-4 py-3 hover:text-[#ff6b00] transition font-medium">TIN TỨC</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg fixed inset-0 z-50 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border rounded-lg"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Search size={18} className="text-gray-400" />
                </button>
              </div>
            </form>
            <div className="space-y-1">
              <Link to="/" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Trang chủ</Link>
              <Link to="/category/laptop" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Laptop</Link>
              <Link to="/khuyen-mai" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium text-[#ff6b00]">Khuyến mãi</Link>
              <Link to="/bang-gia" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Bảng giá</Link>
              <Link to="/tin-tuc" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Tin tức</Link>
              <Link to="/about" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Giới thiệu</Link>
              <Link to="/contact" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Liên hệ</Link>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">Tài khoản</p>
              {user ? (
                <>
                  <Link to="/account" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">
                    {user.fullName} <span className="text-xs text-gray-400">(Tài khoản)</span>
                  </Link>
                  <Link to="/orders" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Đơn hàng</Link>
                  <Link to="/wishlist" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Yêu thích</Link>
                  <button type="button" onClick={handleLogout} className="block w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 rounded-lg font-medium">
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Đăng nhập</Link>
                  <Link to="/register" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Đăng ký</Link>
                  <Link to="/orders" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Đơn hàng</Link>
                  <Link to="/wishlist" className="block px-4 py-3 hover:bg-gray-100 rounded-lg font-medium">Yêu thích</Link>
                </>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-bold text-gray-700 mb-2">Danh mục sản phẩm</p>
              {CATEGORIES.map((cat) => {
                const Icon = iconMap[cat.icon] || Camera
                return (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-lg text-sm text-gray-700"
                  >
                    <div className="w-8 h-8 bg-[#1a73e8]/10 rounded-lg flex items-center justify-center">
                      <Icon size={16} className="text-[#1a73e8]" />
                    </div>
                    {cat.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </header>
    </div>
  )
}

export default Header
