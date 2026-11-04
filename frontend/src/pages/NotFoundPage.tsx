import { Link } from 'react-router-dom'
import { Home, Search } from 'lucide-react'

function NotFoundPage() {
  return (
    <div className="container py-16">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search size={48} className="text-gray-400" />
        </div>
        <h1 className="text-6xl font-black text-gray-200 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Trang không tìm thấy</h2>
        <p className="text-gray-500 mb-8">Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition"
        >
          <Home size={18} />
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
