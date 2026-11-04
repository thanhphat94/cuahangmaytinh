import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Send, RotateCcw, Sparkles, ArrowUpRight } from 'lucide-react'
import api from '../api/api'
import { formatPrice } from '../utils/formatPrice'
import type { Product } from '../types'

type CardProduct = Product & { reason?: string }
type ChatLink = { label: string; path: string }

type Message = {
  from: 'bot' | 'user';
  text: string;
  products?: CardProduct[];
  links?: ChatLink[];
}

type ChatResponse = {
  message: string;
  products?: CardProduct[];
  links?: ChatLink[];
}

const GREETING = 'Xin chào 👋 Mình là Trợ lý AI của Cửa hàng máy tính. Bạn cần tư vấn máy tính, laptop, PC, camera hay thiết bị công nghệ nào hôm nay?'


function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: GREETING }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  const addMessage = (m: Message) => setMessages(prev => [...prev, m])

  const sendMessageToAssistant = async (userText: string) => {
    const requestId = ++requestIdRef.current
    addMessage({ from: 'user', text: userText })
    setLoading(true)

    // Tạo lịch sử chat gửi lên backend
    const history = messages.slice(1).slice(-6).map(m => ({
      role: m.from === 'user' ? ('user' as const) : ('model' as const),
      content: m.text,
      // Giúp backend hiểu các câu nối tiếp như "mở/truy cập sản phẩm đó".
      // Backend sẽ xác minh lại những ID này bằng PostgreSQL trước khi trả về.
      productIds: m.from === 'bot' ? m.products?.map(product => product.id).filter(Boolean) : undefined,
    }))

    try {
      // Ollama có thể cần thêm thời gian ở lần đầu nạp model vào RAM.
      const { data } = await api.post<ChatResponse>(
        '/chatbot/message',
        {
          message: userText,
          history,
        },
        {
          timeout: 195000,
        }
      )

      if (requestId === requestIdRef.current) {
        addMessage({
          from: 'bot',
          text: data.message,
          products: data.products,
          links: data.links,
        })
      }
    } catch (error) {
      console.error('Lỗi gọi API Chatbot:', error)
      if (requestId === requestIdRef.current) {
        const serverMessage = (error as {
          response?: { data?: { message?: unknown } }
        })?.response?.data?.message;
        addMessage({
          from: 'bot',
          text: typeof serverMessage === 'string' && serverMessage.trim()
            ? serverMessage
            : 'Hiện tại trợ lý chưa thể phản hồi. Bạn vui lòng thử lại sau ít phút nhé.',
        })
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }

  const handleSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    void sendMessageToAssistant(text)
  }


  const reset = () => {
    // Vô hiệu hoá phản hồi của request cũ để không chèn vào cuộc trò chuyện mới.
    requestIdRef.current += 1
    setLoading(false)
    setInput('')
    setMessages([{ from: 'bot', text: GREETING }])
  }

  return (
    <>
      {/* Nút mở chatbot */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#1a73e8] to-[#1557b0] text-white rounded-full shadow-2xl hover:scale-105 transition-all"
          aria-label="Chat AI thông minh"
        >
          <Sparkles size={20} className="text-yellow-300 animate-pulse" />
          <MessageCircle size={22} />
          <span className="hidden sm:inline font-semibold text-sm">Hỏi Trợ lý AI</span>
        </button>
      )}

      {/* Khung chat */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 h-[34rem] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a73e8] to-[#0d47a1] text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={16} className="text-yellow-300" />
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  Trợ lý AI
                  <span className="text-[10px] bg-yellow-400 text-gray-900 px-1.5 py-0.2 rounded font-black">AI</span>
                </p>
                <p className="text-[11px] text-white/80">Tư vấn và tìm sản phẩm phù hợp</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} title="Cuộc trò chuyện mới" className="p-1.5 hover:bg-white/20 rounded-lg transition">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setOpen(false)} title="Đóng" className="p-1.5 hover:bg-white/20 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Vùng tin nhắn */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[92%] text-sm rounded-2xl px-3.5 py-2.5 ${
                  m.from === 'user' ? 'bg-[#1a73e8] text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                  {/* Hiển thị sản phẩm gợi ý */}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sản phẩm có sẵn trong cửa hàng:</p>
                      {m.products.map(p => (
                        <Link
                          key={p.id}
                          to={`/product/${p.slug || p.id}`}
                          onClick={() => setOpen(false)}
                          className="flex gap-2.5 p-2 bg-gray-50 hover:bg-blue-50/70 border border-gray-100 rounded-lg transition items-center"
                        >
                          <img
                            src={p.images?.[0] || '/placeholder.png'}
                            alt={p.name}
                            className="w-12 h-12 object-contain bg-white rounded p-1 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/news-placeholder.svg' }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 text-xs line-clamp-2 hover:text-[#1a73e8]">{p.name}</p>
                            <p className="text-[#ff6b00] font-bold text-xs mt-0.5">{formatPrice(p.price)}</p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8] mt-1">
                              Xem chi tiết <ArrowUpRight size={12} />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Liên kết nhanh tới các trang nội dung; chỉ xuất hiện khi đúng ý định khách hỏi. */}
                  {m.links && m.links.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {m.links.map((link) => (
                        <Link
                          key={`${link.path}-${link.label}`}
                          to={link.path}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1a73e8] hover:bg-blue-100 transition"
                        >
                          <span>{link.label}</span>
                          <ArrowUpRight size={14} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-gray-500 flex items-center gap-2 shadow-sm">
                  <Sparkles size={14} className="text-[#1a73e8] animate-spin" />
                  Mình đang tìm thông tin phù hợp cho bạn...
                </div>
              </div>
            )}


            <div ref={bottomRef} />
          </div>

          {/* Input gửi tin */}
          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Hỏi AI bất kỳ điều gì về máy tính..."
              className="flex-1 px-3.5 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-[#1a73e8] text-white rounded-full hover:bg-[#1557b0] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Gửi"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default ChatBot