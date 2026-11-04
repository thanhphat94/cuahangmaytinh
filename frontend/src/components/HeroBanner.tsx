import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Hình dạng thật của mảng `banners` tĩnh — nhiều field trình diễn hơn `Banner` trong `types/index`. */
type BannerSlide = {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  description: string;
  bg: string;
  textColor: string;
  accentColor: string;
  image: string;
  badge: string;
  badgeColor: string;
  link: string;
}

const banners: BannerSlide[] = [
  {
    id: 1,
    title: 'MUA NGAY LIỀN TAY',
    subtitle: 'Chỉ từ',
    price: '690K',
    description: 'Camera Uniarch chính hãng - Bảo hành 24 tháng',
    bg: 'bg-gradient-to-r from-[#1a1a2e] to-[#16213e]',
    textColor: 'text-white',
    accentColor: 'text-yellow-400',
    image: '/images/products/thny_0e61b59c00036757eb0d3cf6e61e02f8.jpg',
    badge: 'CAMERA',
    badgeColor: 'bg-yellow-400 text-black',
    link: '/category/camera-quan-sat',
  },
  {
    id: 2,
    title: 'GIẢM ĐẾN 50%',
    subtitle: 'HOT DEAL TUẦN NÀY',
    price: 'Flash Sale',
    description: 'Camera, Máy in, Linh kiện - Ưu đãi có hạn nhanh tay kẻo lỡ!',
    bg: 'bg-gradient-to-r from-red-700 to-red-900',
    textColor: 'text-white',
    accentColor: 'text-yellow-300',
    image: '/images/products/thny_accbfd67103e9398531ed2474b8392ed.jpeg',
    badge: 'SALE 50%',
    badgeColor: 'bg-white text-red-700',
    link: '/khuyen-mai',
  },
  {
    id: 3,
    title: 'MÁY TÍNH VĂN PHÒNG',
    subtitle: 'Bộ máy tính chính hãng',
    price: 'Từ 3.5TR',
    description: 'Dell, HP, ASUS, Lenovo - Bảo hành chính hãng 12–24 tháng',
    bg: 'bg-gradient-to-r from-[#0f0f23] to-[#1a1a3e]',
    textColor: 'text-white',
    accentColor: 'text-cyan-400',
    image: '/images/products/thny_4838c728e7262683870b7f674ab47950.png',
    badge: 'MÁY TÍNH',
    badgeColor: 'bg-cyan-400 text-black',
    link: '/category/may-tinh-pc',
  },
  {
    id: 4,
    title: 'MÁY IN CHÍNH HÃNG',
    subtitle: 'Canon, HP, Pantum, Brother',
    price: 'Từ 2.5TR',
    description: 'In laser 2 mặt, wifi - Tiết kiệm mực tối đa - Bảo hành 12 tháng',
    bg: 'bg-gradient-to-r from-[#1a6e2e] to-[#0d4a1e]',
    textColor: 'text-white',
    accentColor: 'text-green-300',
    image: '/images/products/thny_f5691be17b446554a60a1c41f743fe24.jpg',
    badge: 'MÁY IN',
    badgeColor: 'bg-green-400 text-black',
    link: '/category/may-in',
  },
]

function HeroBanner() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const next = () => setCurrent((prev) => (prev + 1) % banners.length)
  const prev = () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`w-full shrink-0 ${banner.bg} ${banner.textColor} rounded-xl`}
          >
            <div className="container py-8 md:py-12 flex items-center justify-between gap-4">
              {/* Text side */}
              <div className="flex-1 max-w-lg">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${banner.badgeColor}`}>
                  {banner.badge}
                </span>
                <p className="text-sm md:text-base opacity-80 mb-1">{banner.subtitle}</p>
                <h2 className={`text-3xl md:text-5xl font-black ${banner.accentColor} mb-3`}>
                  {banner.price}
                </h2>
                <h3 className="text-xl md:text-3xl font-bold mb-2">{banner.title}</h3>
                <p className="text-sm md:text-base opacity-80 mb-5">{banner.description}</p>
                <a
                  href={banner.link}
                  className="inline-block px-6 py-2.5 bg-[#ff6b00] text-white rounded-lg font-bold hover:bg-[#e55d00] transition"
                >
                  XEM NGAY
                </a>
              </div>

              {/* Image side - luôn hiển thị */}
              <div className="hidden md:flex w-72 h-56 lg:w-80 lg:h-64 rounded-xl overflow-hidden items-center justify-center bg-white/10 shrink-0">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-contain p-2"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/news-placeholder.svg';
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === current ? 'bg-[#ff6b00] w-8' : 'bg-white/50 w-2.5'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default HeroBanner
