import { useState, useEffect, useRef } from 'react'
import { Tag, Bell } from 'lucide-react'
import { productService } from '../services/productService'
import { formatPrice } from '../utils/formatPrice'
import type { Product } from '../types'

type PromoMessage = {
  icon: 'tag' | 'zap' | 'bell';
  text: string;
  slug: string;
}

// Tạo 3 khuyến mãi ngẫu nhiên mỗi tuần dựa trên seed (số tuần trong năm)
function getWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPromoMessages(products?: Product[]): PromoMessage[] {
  if (!products || products.length === 0) return []
  const week = getWeekNumber()
  const shuffled = seededShuffle(products, week)
  const selected = shuffled.slice(0, Math.min(8, shuffled.length))

  return selected.map((p): PromoMessage => {
    const discount = p.originalPrice && p.originalPrice > p.price
      ? Math.round((1 - p.price / p.originalPrice) * 100)
      : 0
    if (discount > 0) {
      return {
        icon: 'tag',
        text: `🔥 ${p.name} – Giảm ${discount}% còn ${formatPrice(p.price)}`,
        slug: p.slug || p._id || '',
      }
    }
    if (p.isNewProduct) {
      return {
        icon: 'zap',
        text: `✨ Hàng mới về: ${p.name} – ${p.price === 0 ? 'Liên hệ tư vấn' : formatPrice(p.price)}`,
        slug: p.slug || p._id || '',
      }
    }
    return {
      icon: 'bell',
      text: `📦 Sản phẩm nổi bật: ${p.name} – ${formatPrice(p.price)}`,
      slug: p.slug || p._id || '',
    }
  })
}

function NotificationTicker() {
  const [messages, setMessages] = useState<PromoMessage[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Lấy cả featured + new products
        const [featuredRes, newRes] = await Promise.all([
          productService.getFeatured(),
          productService.getNewProducts(),
        ])
        const featured = (featuredRes?.data || featuredRes || []) as Product[]
        const newProds = (newRes?.data || newRes || []) as Product[]

        // Gộp, lọc trùng theo _id
        const all = [...featured]
        const ids = new Set(featured.map((p) => String(p._id)))
        newProds.forEach((p) => {
          if (!ids.has(String(p._id))) all.push(p)
        })

        const msgs = buildPromoMessages(all)
        // Lặp lại đủ dài cho ticker chạy mượt
        setMessages([...msgs, ...msgs, ...msgs])
      } catch (err) {
        console.error('NotificationTicker error:', err)
        setMessages([])
      }
    }
    load()
  }, [])

  if (messages.length === 0) return null

  return (
    <div
      className="bg-[#1a1a2e] text-white py-2 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-0">
        {/* Label cố định */}
        <div className="shrink-0 flex items-center gap-2 bg-[#ff6b00] px-4 py-0.5 mr-4 z-10">
          <Bell size={14} className="text-white" />
          <span className="text-xs font-bold uppercase tracking-wide whitespace-nowrap">Thông báo</span>
        </div>

        {/* Track chạy */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={trackRef}
            className="flex gap-10 whitespace-nowrap"
            style={{
              animation: `ticker-scroll 60s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {messages.map((msg, i) => (
              <a
                key={i}
                href={`/product/${msg.slug}`}
                className="inline-flex items-center gap-2 text-sm hover:text-yellow-300 transition-colors cursor-pointer shrink-0"
                onClick={() => {
                  // dùng Link nếu muốn; hiện để href native
                }}
              >
                <Tag size={13} className="text-[#ff6b00] shrink-0" />
                <span>{msg.text}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* CSS animation inline để tránh cần Tailwind arbitrary */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}

export default NotificationTicker
