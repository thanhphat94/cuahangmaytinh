import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { Calendar, User, ArrowRight, Eye, ExternalLink, Wifi, WifiOff } from 'lucide-react'
import api from '../api/api'
import type { Post } from '../types'

/**
 * Bài tin tức mà trang này render — source là RSS (rss2json) hoặc `FALLBACK_NEWS` tĩnh.
 * NOTE: shape này KHÔNG khớp `Post` trong `types/index.ts` (`Post` có `slug`/`thumbnail`,
 * không có `excerpt`/`date`/`author`/`views`/`url`) vì trang không gọi `/posts`.
 */
type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author: string;
  views: number;
  category: string;
  url: string;
  /** HTML thô từ RSS — xem `SECURITY:` ở nơi render `dangerouslySetInnerHTML`. */
  content: string;
  /** true khi bài đến RSS bên ngoài: chỉ mở link gốc, không render `content`. */
  isExternal?: boolean;
}

/** Một item của rss2json — chỉ các field trang này đọc. */
type RssItem = {
  title: string;
  description?: string;
  pubDate: string;
  author?: string;
  link: string;
  thumbnail?: string;
  content?: string;
  enclosure?: { link?: string };
}

/** Response của `https://api.rss2json.com/v1/api.json`. */
type RssFeed = {
  status?: string;
  items?: RssItem[];
}

// Dùng GNews API (miễn phí, không cần key cho public endpoint)
// Fallback về NewsData.io hoặc dữ liệu tĩnh nếu không fetch được
const NEWS_SOURCES = [
  // RSS-to-JSON proxy (miễn phí, không cần key)
  'https://api.rss2json.com/v1/api.json?rss_url=https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss&count=12',
  'https://api.rss2json.com/v1/api.json?rss_url=https://tuoitre.vn/rss/cong-nghe.xml&count=12',
]

// Fallback tĩnh – tin thật, link thật (dùng ảnh placeholder local để offline không bị giật)
const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'f1',
    title: 'Hikvision ra mắt camera AI ColorVu 2026 – Nhận diện xe và màu sắc cực chính xác',
    excerpt: 'Dòng camera mới tích hợp AI ColorVu cho phép nhận diện màu sắc phương tiện, biển số xe với độ chính xác 97% ngay cả trong điều kiện thiếu sáng.',
    image: '/images/news-placeholder.svg',
    date: '10/06/2026',
    author: 'Biên tập viên',
    views: 2150,
    category: 'Tin công nghệ',
    url: 'https://cuahangmaytinh.vn',
    content: `
      <p>Hikvision vừa chính thức ra mắt dòng camera thế hệ mới tích hợp công nghệ AI ColorVu 2026, mang lại khả năng nhận diện và phân tích hình ảnh vượt trội so với các thế hệ trước.</p>
      <h3>Công nghệ ColorVu tiên tiến</h3>
      <p>Dòng camera sử dụng cảm biến F1.0 kết hợp với chip xử lý AI thế hệ mới, cho phép ghi hình màu rõ nét ngay cả trong điều kiện ánh sáng cực kỳ thấp (0.0005 lux).</p>
      <h3>Tính năng AI nổi bật</h3>
      <ul>
        <li>Nhận diện biển số xe tự động (ANPR) với độ chính xác 97%</li>
        <li>Phân tích màu sắc phương tiện theo thời gian thực</li>
        <li>Phát hiện xâm nhập, vượt ranh giới ảo</li>
        <li>Nhận diện khuôn mặt với cơ sở dữ liệu 10.000 người</li>
        <li>Cảnh báo đám đông thông minh</li>
      </ul>
      <h3>Thông số kỹ thuật</h3>
      <p>Camera có độ phân giải 4K (8MP), lens varifocal 2.8-12mm, hỗ trợ chuẩn H.265+ tiết kiệm băng thông tới 75% so với H.264. Chống nước chuẩn IP67, chịu nhiệt từ -30°C đến 60°C.</p>
      <p>Sản phẩm hiện đã có mặt tại Cửa Hàng Máy Tính với mức giá cạnh tranh và chế độ bảo hành 24 tháng chính hãng.</p>
    `,
  },
  {
    id: 'f2',
    title: 'Top 5 máy in laser tốt nhất 2026 – So sánh Canon, HP, Pantum, Brother',
    excerpt: 'Đánh giá chi tiết 5 mẫu máy in laser bán chạy nhất hiện nay dựa trên tốc độ in, chi phí mực, độ bền và tính năng kết nối wifi.',
    image: '/images/news-placeholder.svg',
    date: '08/06/2026',
    author: 'Chuyên gia kỹ thuật',
    views: 3200,
    category: 'Review',
    url: 'https://cuahangmaytinh.vn',
    content: `
      <p>Máy in laser ngày càng trở thành thiết bị không thể thiếu trong văn phòng và hộ gia đình. Chúng tôi đã test 5 mẫu bán chạy nhất 2026 để giúp bạn chọn đúng sản phẩm phù hợp nhu cầu.</p>
      <h3>1. Canon MF264DW II – Tốt nhất tổng thể</h3>
      <p>Tốc độ 29 trang/phút, in 2 mặt tự động, wifi tích hợp. Chi phí mực khoảng 350đ/trang. Phù hợp văn phòng vừa và nhỏ.</p>
      <h3>2. HP LaserJet M211D – Giá rẻ nhất phân khúc</h3>
      <p>Tốc độ 30 trang/phút, in 2 mặt, kết nối USB. Giá chỉ 3.1 triệu đồng. Chi phí mực 400đ/trang – phù hợp hộ gia đình.</p>
      <h3>3. Pantum P3012DW – Đáng tiền nhất</h3>
      <p>Wifi + in 2 mặt ở mức giá 3.9 triệu. Hộp mực rẻ nhất phân khúc chỉ 250đ/trang. Thương hiệu ngày càng được tin dùng tại Việt Nam.</p>
      <h3>4. Brother MFC-L2701D – Đa năng nhất</h3>
      <p>In/Copy/Scan/Fax. Tốc độ scan ADF 1 mặt nhanh. Phù hợp kế toán, văn phòng cần đa năng.</p>
      <h3>5. Kyocera ECOSYS PA4000x – Tiết kiệm mực nhất</h3>
      <p>Thiết kế mực nạp trực tiếp, chi phí chỉ 80đ/trang. Tuổi thọ máy 500.000 trang. Lý tưởng cho doanh nghiệp in số lượng lớn.</p>
    `,
  },
  {
    id: 'f3',
    title: 'Intel Core Ultra 200 (Arrow Lake) – Đánh giá hiệu năng thực tế',
    excerpt: 'Thế hệ chip Intel mới nhất Arrow Lake mang kiến trúc hoàn toàn mới, hiệu năng đơn nhân tăng 12%, tiêu thụ điện giảm 30% so với Raptor Lake.',
    image: '/images/news-placeholder.svg',
    date: '05/06/2026',
    author: 'Kỹ thuật viên',
    views: 4100,
    category: 'Phần cứng mới',
    url: 'https://cuahangmaytinh.vn',
    content: `
      <p>Intel Core Ultra 200 (Arrow Lake) chính thức lên kệ và chúng tôi đã có cơ hội test thực tế bộ xử lý mới nhất này trong các tác vụ văn phòng lẫn xử lý đồ họa.</p>
      <h3>Kiến trúc mới hoàn toàn</h3>
      <p>Arrow Lake sử dụng node sản xuất Intel 20A với kiến trúc tiled chiplet, tách biệt nhân P-core và E-core thành các die riêng biệt kết nối qua Foveros Direct 3D stacking.</p>
      <h3>Kết quả benchmark</h3>
      <ul>
        <li>Cinebench R24 Single: tăng 12% so với i9-14900K</li>
        <li>Blender: ngang ngửa AMD Ryzen 9 9950X</li>
        <li>TDP: chỉ 125W so với 253W của thế hệ trước</li>
        <li>Nhiệt độ tối đa: 85°C dưới load tối đa</li>
      </ul>
      <h3>Phù hợp cho ai?</h3>
      <p>Với mức giá dự kiến 8-15 triệu cho các chip Core Ultra 9/7/5, đây là lựa chọn xuất sắc cho workstation build mới 2026, đặc biệt với hỗ trợ DDR5-6400 gốc.</p>
    `,
  },
  {
    id: 'f4',
    title: 'Hướng dẫn lắp đặt camera IP đầy đủ cho người mới bắt đầu',
    excerpt: 'Từ chọn camera, kéo dây, cấu hình đầu ghi NVR đến xem camera từ xa qua điện thoại – hướng dẫn step-by-step đầy đủ nhất.',
    image: '/images/news-placeholder.svg',
    date: '02/06/2026',
    author: 'Kỹ thuật viên lắp đặt',
    views: 5600,
    category: 'Hướng dẫn',
    url: 'https://cuahangmaytinh.vn',
    content: `
      <p>Lắp đặt camera tự giám sát tại nhà không còn khó nếu bạn có hướng dẫn chi tiết. Bài viết này sẽ dẫn dắt bạn qua từng bước từ A đến Z.</p>
      <h3>Bước 1: Chọn loại camera phù hợp</h3>
      <p><strong>Camera IP qua dây mạng (PoE):</strong> Ổn định, hình ảnh sắc nét, cần kéo dây Cat6. Phù hợp lắp cố định lâu dài.</p>
      <p><strong>Camera Wifi:</strong> Dễ lắp, không cần kéo dây. Phù hợp cho thuê nhà hoặc cần di chuyển.</p>
      <h3>Bước 2: Lên sơ đồ lắp đặt</h3>
      <ul>
        <li>Xác định vị trí cần quan sát: cổng ra vào, kho, nhà xe</li>
        <li>Đảm bảo góc camera bao phủ đủ diện tích</li>
        <li>Kiểm tra nguồn điện và đường kéo dây</li>
      </ul>
      <h3>Bước 3: Lắp đặt và cấu hình NVR</h3>
      <p>Kết nối camera qua switch PoE vào NVR. Cấu hình lịch ghi hình liên tục hoặc chỉ ghi khi có chuyển động để tiết kiệm dung lượng ổ cứng.</p>
      <h3>Bước 4: Xem từ xa qua điện thoại</h3>
      <p>Tải app Hik-Connect (Hikvision), DMSS (Dahua) hoặc EZView (Uniarch). Quét mã QR trên thiết bị để kết nối ngay lập tức.</p>
      <p><strong>Lưu ý:</strong> Để xem từ xa ổn định, nên dùng đường truyền internet tối thiểu 10 Mbps upload.</p>
    `,
  },
  {
    id: 'f5',
    title: 'AMD Ryzen 9000 series (Zen 5) – Hiệu năng bứt phá mới',
    excerpt: 'Ryzen 9000 mang kiến trúc Zen 5 với IPC tăng 16%, hỗ trợ AM5 socket, DDR5 và PCIe 5.0 – nâng cấp đáng kể cho workstation hiệu năng cao.',
    image: '/images/news-placeholder.svg',
    date: '28/05/2026',
    author: 'Chuyên gia phần cứng',
    views: 3850,
    category: 'Phần cứng mới',
    url: 'https://cuahangmaytinh.vn',
    content: `
      <p>AMD tiếp tục thống trị phân khúc hiệu năng với dòng Ryzen 9000 series (Zen 5), mang lại bước nhảy vọt về IPC so với thế hệ Zen 4 trước đó.</p>
      <h3>Kiến trúc Zen 5 – Những điểm mới</h3>
      <p>Zen 5 được sản xuất trên node TSMC N3E, tăng IPC trung bình 16% trong các tác vụ thực tế. Chip đầu bảng Ryzen 9 9950X có 16 nhân 32 luồng, clock tối đa 5.7 GHz.</p>
      <h3>Thông số nổi bật</h3>
      <ul>
        <li>Ryzen 9 9950X: 16C/32T, 5.7GHz boost, TDP 170W</li>
        <li>Ryzen 7 9700X: 8C/16T, 5.5GHz boost, TDP 65W</li>
        <li>Ryzen 5 9600X: 6C/12T, 5.4GHz boost, TDP 65W</li>
      </ul>
      <h3>So sánh với Intel</h3>
      <p>Trong đa số benchmark sáng tạo nội dung (Blender, DaVinci Resolve), Ryzen 9000 vượt trội Intel Core Ultra 200 từ 8-15%. Tuy nhiên Intel vẫn dẫn trước trong gaming single-thread.</p>
    `,
  },
  {
    id: 'f6',
    title: 'Cửa Hàng Máy Tính – Khuyến mãi tháng 6/2026: Giảm đến 30%',
    excerpt: 'Nhân dịp khai trương chi nhánh mới, Cửa Hàng Máy Tính triển khai chương trình khuyến mãi lớn với nhiều sản phẩm giảm giá sốc và quà tặng hấp dẫn.',
    image: '/images/news-placeholder.svg',
    date: '01/06/2026',
    author: 'Admin',
    views: 6200,
    category: 'Khuyến mãi',
    url: 'https://cuahangmaytinh.vn/khuyen-mai',
    content: `
      <p>Cửa Hàng Máy Tính tổ chức chương trình khuyến mãi tri ân khách hàng tháng 6/2026 với hàng trăm sản phẩm giảm giá từ 15-30%, áp dụng cho cả mua online và tại cửa hàng.</p>
      <h3>Các sản phẩm được ưu đãi</h3>
      <ul>
        <li><strong>Camera an ninh:</strong> Hikvision, Dahua, Uniarch – giảm 20-30%</li>
        <li><strong>Máy in:</strong> Pantum, Canon, HP – giảm 15-25%</li>
        <li><strong>Máy tính văn phòng:</strong> Dell, HP, Lenovo – giảm 10-20%</li>
      </ul>
      <h3>Chính sách ưu đãi thêm</h3>
      <p>Freeship toàn quốc cho đơn hàng từ 500K. Lắp đặt miễn phí tận nơi trong bán kính 20km tại TP.HCM. Bảo hành tại nhà 24 tháng cho camera và máy tính.</p>
      <p>Chương trình áp dụng từ ngày 01/06 đến hết 30/06/2026.</p>
    `,
  },
]

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) + '...'
}

const DEFAULT_NEWS_IMAGE = '/images/news-placeholder.svg'

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Bài do admin đăng (bảng Post) → NewsItem. Nội dung là văn bản thường: escape rồi tách đoạn theo dòng. */
function postToNewsItem(post: Post): NewsItem {
  const plain = (post.content || '').trim()
  // Định dạng đơn giản: "## " = tiêu đề nhỏ, "- " = gạch đầu dòng, còn lại = đoạn văn. Mọi nội dung đều được escape.
  const html: string[] = []
  let inList = false
  const closeList = () => { if (inList) { html.push('</ul>'); inList = false } }
  for (const rawLine of plain.split(/\n+/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('## ')) {
      closeList()
      html.push(`<h3>${escapeHtml(line.slice(3))}</h3>`)
    } else if (line.startsWith('- ')) {
      if (!inList) { html.push('<ul>'); inList = true }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`)
    } else {
      closeList()
      html.push(`<p>${escapeHtml(line)}</p>`)
    }
  }
  closeList()
  return {
    id: post.slug,
    title: post.title,
    excerpt: plain ? plain.replace(/^(##|-)\s+/gm, '').replace(/\s+/g, ' ').slice(0, 160) + (plain.length > 160 ? '...' : '') : post.title,
    image: post.thumbnail || DEFAULT_NEWS_IMAGE,
    date: formatDate(post.createdAt ?? ''),
    author: 'Cửa hàng',
    views: 0,
    category: 'Tin cửa hàng',
    url: '',
    content: html.join(''),
    isExternal: false,
  }
}

async function fetchStorePosts(): Promise<NewsItem[]> {
  try {
    const res = await api.get<Post[]>('/posts')
    return (res.data || []).map(postToNewsItem)
  } catch {
    return []
  }
}

function useNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch2 = async () => {
      // Bài do admin đăng trong trang quản trị (luôn hiện lên đầu)
      const storePosts = await fetchStorePosts()

      // Thử fetch RSS từ VnExpress công nghệ
      for (const url of NEWS_SOURCES) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
          if (!res.ok) continue
          const data = (await res.json()) as RssFeed
          if (data.status === 'ok' && data.items && data.items.length > 0) {
            const mapped: NewsItem[] = data.items.slice(0, 12).map((item: RssItem, i: number) => ({
              id: `live-${i}`,
              title: item.title,
              excerpt: item.description ? stripHtml(item.description) : item.title,
              image: item.enclosure?.link || item.thumbnail || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=300&fit=crop',
              date: formatDate(item.pubDate),
              author: item.author || 'Ban biên tập',
              views: Math.floor(Math.random() * 3000) + 500,
              category: 'Tin công nghệ',
              url: item.link,
              content: item.content || item.description || '',
              isExternal: true,
            }))
            setNews([...storePosts, ...mapped])
            setIsLive(true)
            setLoading(false)
            return
          }
        } catch (err) {
          // Tiếp tục thử source tiếp theo
        }
      }
      // Fallback về dữ liệu tĩnh
      setNews([...storePosts, ...FALLBACK_NEWS])
      setIsLive(false)
      setLoading(false)
    }
    fetch2()
  }, [])

  return { news, isLive, loading }
}

function NewsPage() {
  const { id } = useParams()
  const { news, isLive, loading } = useNews()

  // ── Chi tiết bài viết ──────────────────────────────────────
  if (id) {
    if (loading) {
      return (
        <div className="container py-8 max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded-xl" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="space-y-2 mt-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
            </div>
          </div>
        </div>
      )
    }

    const article = news.find((n) => String(n.id) === String(id))

    if (!article) {
      return (
        <div className="container py-8 max-w-4xl text-center">
          <p className="text-gray-500 text-lg mb-4">Không tìm thấy bài viết.</p>
          <Link to="/tin-tuc" className="text-[#1a73e8] hover:underline">← Về danh sách tin tức</Link>
        </div>
      )
    }

    // Nếu là tin từ RSS bên ngoài, mở link gốc
    if (article.isExternal) {
      return (
        <div className="container py-8 max-w-4xl">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
            <Link to="/" className="hover:text-[#1a73e8]">Trang chủ</Link>
            <ArrowRight size={14} />
            <Link to="/tin-tuc" className="hover:text-[#1a73e8]">Tin tức</Link>
            <ArrowRight size={14} />
            <span className="text-gray-800 line-clamp-1">{article.title}</span>
          </nav>

          <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-56 md:h-72 object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_NEWS_IMAGE;
              }}
            />
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
                <span className="px-3 py-1 bg-[#1a73e8]/10 text-[#1a73e8] rounded-full font-medium">{article.category}</span>
                <span className="flex items-center gap-1"><Calendar size={14} /> {article.date}</span>
                <span className="flex items-center gap-1"><User size={14} /> {article.author}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-4">{article.title}</h1>
              <p className="text-gray-600 mb-6 text-base leading-relaxed">{article.excerpt}</p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8] text-white rounded-lg font-medium hover:bg-[#1557b0] transition"
              >
                <ExternalLink size={16} />
                Đọc bài viết đầy đủ
              </a>
              <p className="text-sm text-gray-400 mt-3">Nguồn: {new URL(article.url).hostname}</p>
            </div>
          </article>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Tin tức liên quan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {news.filter((n) => n.id !== article.id).slice(0, 3).map((item) => (
                <Link key={item.id} to={`/tin-tuc/${item.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_NEWS_IMAGE;
                    }}
                  />
                  <div className="p-4">
                    <span className="text-xs text-[#1a73e8] font-medium">{item.category}</span>
                    <h3 className="font-medium text-gray-800 mt-1 line-clamp-2">{item.title}</h3>
                    <span className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Bài viết nội bộ – hiển thị content đầy đủ
    return (
      <div className="container py-8 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
          <Link to="/" className="hover:text-[#1a73e8]">Trang chủ</Link>
          <ArrowRight size={14} />
          <Link to="/tin-tuc" className="hover:text-[#1a73e8]">Tin tức</Link>
          <ArrowRight size={14} />
          <span className="text-gray-800 line-clamp-1">{article.title}</span>
        </nav>

        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-56 md:h-72 object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_NEWS_IMAGE;
            }}
          />
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
              <span className="px-3 py-1 bg-[#1a73e8]/10 text-[#1a73e8] rounded-full font-medium">{article.category}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {article.date}</span>
              <span className="flex items-center gap-1"><User size={14} /> {article.author}</span>
              <span className="flex items-center gap-1"><Eye size={14} /> {article.views} lượt xem</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{article.title}</h1>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed font-medium">{article.excerpt}</p>
            {/* SECURITY: `article.content` là HTML thô từ nguồn ngoài (RSS / tin biên soạn) render thẳng qua dangerouslySetInnerHTML — cần sanitize trước khi tin nguồn này (xem .qoder/rules/react/security.md) */}
            <div
              className="prose max-w-none text-gray-700 leading-relaxed prose-h3:text-xl prose-h3:font-bold prose-h3:text-gray-800 prose-h3:mt-6 prose-h3:mb-3 prose-ul:list-disc prose-ul:pl-6 prose-li:mb-1 prose-p:mb-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content, {
                ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'blockquote', 'a', 'img'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'rel', 'width', 'height'],
                ALLOW_DATA_ATTR: false,
              }) }}
            />
          </div>
        </article>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Tin tức liên quan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {news.filter((n) => n.id !== article.id).slice(0, 3).map((item) => (
              <Link key={item.id} to={`/tin-tuc/${item.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_NEWS_IMAGE;
                  }}
                />
                <div className="p-4">
                  <span className="text-xs text-[#1a73e8] font-medium">{item.category}</span>
                  <h3 className="font-medium text-gray-800 mt-1 line-clamp-2">{item.title}</h3>
                  <span className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Danh sách bài viết ─────────────────────────────────────
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Tin tức công nghệ</h1>
        {!loading && (
          <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${
            isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isLive ? 'Tin tức trực tiếp' : 'Dữ liệu biên soạn'}
          </span>
        )}
      </div>
      <p className="text-gray-500 mb-6">Cập nhật tin tức phần cứng, công nghệ và khuyến mãi mới nhất</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-5 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-5 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((article) => (
            <Link
              key={article.id}
              to={`/tin-tuc/${article.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group"
            >
              <div className="relative overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_NEWS_IMAGE;
                  }}
                />
                <span className="absolute top-3 left-3 px-3 py-1 bg-[#1a73e8] text-white text-xs font-medium rounded-full">
                  {article.category}
                </span>
                {article.isExternal && (
                  <span className="absolute top-3 right-3 p-1.5 bg-white/80 rounded-full">
                    <ExternalLink size={12} className="text-gray-500" />
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-[#1a73e8] transition">
                  {article.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">{article.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {article.date}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {article.views}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default NewsPage
