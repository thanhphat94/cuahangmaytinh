import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Facebook, Youtube, Instagram, ArrowUp } from 'lucide-react'
import { useSiteSettings } from '../context/SiteSettingsContext'

function Footer() {
  const { settings } = useSiteSettings()
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="bg-[#1a1a2e] text-white">
      {/* Main footer */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-gray-900 border border-gray-700 shadow-sm overflow-hidden">
                <img src="/images/logodoan2-icon.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{settings.storeName.toUpperCase()}</h3>
                <p className="text-xs text-gray-400">{settings.tagline}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              {settings.description}
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-[#1a73e8] transition">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-red-600 transition">
                <Youtube size={18} />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-pink-500 transition">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Trang chủ</Link></li>
              <li><Link to="/khuyen-mai" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Khuyến mãi</Link></li>
              <li><Link to="/tin-tuc" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Tin tức</Link></li>
              <li><Link to="/bang-gia" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Bảng giá</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Giới thiệu</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Liên hệ</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold text-lg mb-4">Danh mục sản phẩm</h4>
            <ul className="space-y-2">
              <li><Link to="/category/camera-quan-sat" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Camera an ninh</Link></li>
              <li><Link to="/category/laptop" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Laptop</Link></li>
              <li><Link to="/category/may-tinh-pc" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Máy tính</Link></li>
              <li><Link to="/category/may-in" className="text-gray-400 hover:text-[#ff6b00] transition text-sm">Máy in</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-4">Thông tin liên hệ</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[#ff6b00] mt-0.5 shrink-0" />
                <span className="text-gray-400 text-sm">{settings.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-[#ff6b00] shrink-0" />
                <span className="text-gray-400 text-sm">{settings.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[#ff6b00] shrink-0" />
                <span className="text-gray-400 text-sm">{settings.email}</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock size={18} className="text-[#ff6b00] shrink-0" />
                <span className="text-gray-400 text-sm">{settings.workingHours}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-700">
        <div className="container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-gray-400 text-sm text-center md:text-left">
           © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
          <button
            onClick={scrollToTop}
            className="w-10 h-10 bg-[#ff6b00] rounded-lg flex items-center justify-center hover:bg-[#e55d00] transition"
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </footer>
  )
}

export default Footer
