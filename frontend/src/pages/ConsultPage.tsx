import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bot, Loader2 } from 'lucide-react'
import api from '../api/api'
import ProductCard from '../components/ProductCard'
import { JOBS, BUDGETS } from '../utils/consultOptions'
import type { Product } from '../types'

/**
 * Một laptop mà `/chatbot/recommend` gợi ý kèm lý do (`reason`) — xem
 * `backend/src/services/chatbotService.ts#recommend` (thêm `_id` + `reason` vào product).
 * `discount?: number` để thu hẹp badge mà `ProductCard` đọc (`Product.discount` rộng hơn).
 */
type RecommendedProduct = Product & { reason?: string; discount?: number }

/**
 * Cùng shape với `ChatbotReply` trong `types/index.ts`, chỉ khác `products` đã thu hẹp
 * `discount` xuống `number` cho `ProductCard` — giữ kiểu local để không nới shared type.
 */
type RecommendResult = {
  message: string;
  products: RecommendedProduct[];
  total: number;
  exact: boolean;
}

// Trang hiện danh sách laptop (có hình ảnh) mà chatbot đã tư vấn
function ConsultPage() {
  const [params] = useSearchParams()
  const job = params.get('job') || ''
  const min = params.get('min') || ''
  const max = params.get('max') || ''
  const priority = params.get('priority') || ''

  const [data, setData] = useState<RecommendResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Tư vấn laptop — Cửa Hàng Máy Tính'
    setLoading(true)
    api.post<RecommendResult>('/chatbot/recommend', { job, minPrice: min, maxPrice: max, priority })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [job, min, max, priority])

  const jobLabel = JOBS.find(j => j.id === job)?.label
  const budgetLabel = BUDGETS.find(b => String(b.min) === (min || '0') && String(b.max) === (max || '0'))?.label

  return (
    <div className="container py-8">
      <div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] rounded-xl px-6 py-5 text-white mb-6 flex items-center gap-4">
        <Bot size={36} />
        <div>
          <h1 className="text-2xl font-bold">Laptop tư vấn dành cho bạn</h1>
          <p className="text-white/80 text-sm mt-0.5">
            {[jobLabel, budgetLabel].filter(Boolean).join(' · ') || 'Theo nhu cầu bạn đã chọn'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#1a73e8]" size={36} /></div>
      ) : data ? (
        <>
          <p className="text-gray-700 mb-4">{data.message}</p>
          {data.products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.products.map(p => (
                <div key={p.id}>
                  <ProductCard product={p} />
                  {p.reason && <p className="text-xs text-gray-500 mt-2 px-1">{p.reason}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">Chưa có laptop phù hợp. Hãy thử chọn tầm giá khác với chatbot nhé!</div>
          )}
        </>
      ) : (
        <p className="text-red-500">Không tải được dữ liệu tư vấn, vui lòng thử lại.</p>
      )}

      <div className="mt-8">
        <Link to="/category/laptop" className="text-[#1a73e8] underline">Xem tất cả laptop</Link>
      </div>
    </div>
  )
}

export default ConsultPage
