import { useEffect, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import api from '../api/api'
import type { PriceList } from '../types'

const formatSize = (bytes: number): string => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

// Trang công khai: khách xem và tải bảng giá
function PriceListPage() {
  const [items, setItems] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Bảng giá sản phẩm — Cửa Hàng Máy Tính'
    api.get<PriceList[]>('/price-lists').then(r => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Bảng giá sản phẩm</h1>
      <p className="text-gray-500 text-sm mb-6">Tải bảng giá mới nhất của cửa hàng về máy để tham khảo.</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#1a73e8]" size={32} /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-16">Hiện chưa có bảng giá nào.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <FileText className="text-[#1a73e8] shrink-0" size={32} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">
                  {item.title} {i === 0 && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Mới nhất</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')} · {formatSize(item.size)}
                </p>
              </div>
              {/* Link tải trực tiếp từ server */}
              <a
                href={`${api.defaults.baseURL}/price-lists/${item.id}/download`}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg text-sm hover:bg-[#1557b0] transition"
              >
                <Download size={16} /> Tải về
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PriceListPage
