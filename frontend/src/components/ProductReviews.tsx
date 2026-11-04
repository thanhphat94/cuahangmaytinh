import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Star, Loader2, CheckCircle } from 'lucide-react'
import api, { getErrorMessage } from '../api/api'
import { useAppSelector } from '../redux/hooks'

/** Một đánh giá đã được duyệt — `GET /api/reviews/product/:productId`. */
type ReviewItem = {
  id: string
  _id?: string
  rating: number
  comment?: string | null
  createdAt: string
  userId?: { fullName?: string; avatar?: string | null } | null
}

type Props = {
  productId: string
  /** Báo điểm trung bình + số lượt lên trang cha (hiển thị cạnh tên sản phẩm). */
  onStats?: (average: number, count: number) => void
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-100'}
        />
      ))}
    </div>
  )
}

const RATING_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt']

function ProductReviews({ productId, onStats }: Props) {
  const user = useAppSelector((s) => s.auth.user)

  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)

  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [doneMessage, setDoneMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ReviewItem[]>(`/reviews/product/${productId}`)
      const list = res.data || []
      setReviews(list)
      const avg = list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0
      onStats?.(avg, list.length)
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (rating < 1) {
      setError('Vui lòng chọn số sao đánh giá')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/reviews', { productId, rating, comment: comment.trim() || undefined })
      setDoneMessage('Cảm ơn bạn! Đánh giá đã được gửi và sẽ hiển thị sau khi cửa hàng duyệt.')
      setRating(0)
      setComment('')
    } catch (err) {
      const msg = getErrorMessage(err, 'Gửi đánh giá thất bại. Vui lòng thử lại.')
      // Đã đánh giá rồi → ẩn form luôn, tránh gửi lại
      if (msg.includes('đã đánh giá')) setDoneMessage(msg)
      else setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const shown = hover || rating

  return (
    <div className="space-y-8">
      {/* ── Tổng quan ── */}
      <div className="flex items-center gap-4">
        {reviews.length > 0 ? (
          <>
            <div className="text-4xl font-bold text-gray-800">{average.toFixed(1)}</div>
            <div>
              <Stars value={average} size={18} />
              <p className="text-sm text-gray-500 mt-1">{reviews.length} đánh giá</p>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</p>
        )}
      </div>

      {/* ── Form viết đánh giá ── */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 mb-3">Viết đánh giá của bạn</h3>

        {!user ? (
          <p className="text-sm text-gray-600">
            Vui lòng{' '}
            <Link to="/login" className="text-[#1a73e8] font-medium hover:underline">đăng nhập</Link>{' '}
            để đánh giá sản phẩm này.
          </p>
        ) : doneMessage ? (
          <div className="flex items-start gap-2 text-green-700 text-sm">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <p>{doneMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Bạn thấy sản phẩm này thế nào?</p>
              <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setRating(i)}
                    className="p-0.5"
                    aria-label={`${i} sao`}
                  >
                    <Star
                      size={30}
                      className={i <= shown ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-white'}
                    />
                  </button>
                ))}
                {shown > 0 && <span className="ml-2 text-sm text-gray-500">{RATING_LABELS[shown]}</span>}
              </div>
            </div>

            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm (không bắt buộc)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 resize-none text-sm bg-white"
              />
              <p className="text-xs text-gray-400 text-right">{comment.length}/1000</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-medium hover:bg-[#1557b0] transition disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Gửi đánh giá
            </button>
          </form>
        )}
      </div>

      {/* ── Danh sách đánh giá ── */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#1a73e8]" /></div>
      ) : (
        <div className="divide-y divide-gray-100">
          {reviews.map((r) => (
            <div key={r._id || r.id} className="py-4 flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1a73e8] text-white text-sm font-bold flex items-center justify-center shrink-0">
                {(r.userId?.fullName || 'K').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-800">{r.userId?.fullName || 'Khách hàng'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Stars value={r.rating} />
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line break-words">{r.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductReviews
