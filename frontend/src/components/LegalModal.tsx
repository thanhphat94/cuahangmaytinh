import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useSiteSettings } from '../context/SiteSettingsContext'

export type LegalType = 'terms' | 'privacy'

type Props = {
  /** `null` = đang đóng. */
  type: LegalType | null
  onClose: () => void
}

type Section = { title: string; body: string[] }

/**
 * Popup hiển thị Điều khoản sử dụng / Chính sách bảo mật.
 * Dùng chung cho trang Thanh toán và trang Đăng ký (thay cho link /terms, /privacy không tồn tại).
 */
function LegalModal({ type, onClose }: Props) {
  const { settings } = useSiteSettings()

  useEffect(() => {
    if (!type) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [type, onClose])

  if (!type) return null

  const store = settings.storeName || 'Cửa Hàng Máy Tính'

  const TERMS: Section[] = [
    {
      title: '1. Chấp nhận điều khoản',
      body: [
        `Khi truy cập website và đặt hàng tại ${store}, bạn xác nhận đã đọc, hiểu và đồng ý với các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.`,
      ],
    },
    {
      title: '2. Tài khoản người dùng',
      body: [
        'Bạn cung cấp thông tin chính xác khi đăng ký (họ tên, email, số điện thoại) và tự chịu trách nhiệm bảo mật mật khẩu của mình.',
        'Cửa hàng có quyền tạm khoá tài khoản có dấu hiệu gian lận, giả mạo thông tin hoặc vi phạm điều khoản này.',
      ],
    },
    {
      title: '3. Đặt hàng và xác nhận đơn',
      body: [
        'Đơn hàng chỉ được ghi nhận khi bạn nhập đủ thông tin người nhận (họ tên, số điện thoại, địa chỉ) và hệ thống thông báo tạo đơn thành công.',
        'Cửa hàng sẽ liên hệ xác nhận đơn qua số điện thoại hoặc email. Đơn có thể bị từ chối nếu sản phẩm hết hàng, thông tin không liên lạc được hoặc có sai sót về giá do lỗi hiển thị.',
      ],
    },
    {
      title: '4. Giá bán và thanh toán',
      body: [
        'Giá hiển thị trên website là giá bán lẻ đã bao gồm thuế (nếu có), chưa gồm phí vận chuyển. Phí vận chuyển được hiển thị rõ ở bước thanh toán; đơn từ mức miễn phí vận chuyển công bố trên website sẽ không tính phí.',
        'Phương thức thanh toán gồm: thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng, ví MoMo và VNPay. Với MoMo/VNPay, đơn chỉ được xác nhận thanh toán sau khi cổng thanh toán báo thành công.',
        'Mã giảm giá chỉ áp dụng một lần cho mỗi đơn, theo điều kiện hiển thị kèm mã và không quy đổi thành tiền mặt.',
      ],
    },
    {
      title: '5. Giao hàng',
      body: [
        'Thời gian giao hàng dự kiến phụ thuộc khu vực và đơn vị vận chuyển. Bạn cần kiểm tra ngoại quan sản phẩm khi nhận hàng và báo ngay cho cửa hàng nếu phát hiện hư hỏng, thiếu hàng.',
      ],
    },
    {
      title: '6. Huỷ đơn',
      body: [
        'Bạn có thể tự huỷ đơn trong mục "Đơn hàng của tôi" khi đơn còn ở trạng thái "Chờ xác nhận". Đơn đã được xác nhận, đang giao hoặc đã thanh toán trực tuyến cần liên hệ cửa hàng để được hỗ trợ.',
      ],
    },
    {
      title: '7. Đổi trả và bảo hành',
      body: [
        'Sản phẩm được bảo hành chính hãng theo thời hạn ghi trên trang sản phẩm. Việc đổi trả áp dụng khi sản phẩm lỗi do nhà sản xuất, còn đầy đủ phụ kiện, hộp và hoá đơn mua hàng.',
        'Không áp dụng bảo hành đối với hư hỏng do rơi vỡ, vào nước, tự ý sửa chữa hoặc sử dụng sai hướng dẫn.',
      ],
    },
    {
      title: '8. Quyền sở hữu nội dung',
      body: [
        'Hình ảnh, nội dung và thương hiệu trên website thuộc quyền sở hữu của cửa hàng hoặc đối tác. Nghiêm cấm sao chép, sử dụng cho mục đích thương mại khi chưa được đồng ý bằng văn bản.',
      ],
    },
    {
      title: '9. Thay đổi điều khoản',
      body: [
        'Cửa hàng có thể cập nhật điều khoản theo từng thời điểm. Phiên bản mới có hiệu lực ngay khi đăng tải trên website.',
      ],
    },
  ]

  const PRIVACY: Section[] = [
    {
      title: '1. Thông tin chúng tôi thu thập',
      body: [
        'Họ tên, số điện thoại, email, địa chỉ giao hàng, lịch sử đơn hàng và thông tin bạn tự nguyện cung cấp khi đăng ký, đặt hàng hoặc liên hệ.',
        'Chúng tôi không lưu số thẻ ngân hàng. Giao dịch MoMo/VNPay được xử lý trực tiếp trên cổng thanh toán của đối tác.',
      ],
    },
    {
      title: '2. Mục đích sử dụng',
      body: [
        'Xử lý và giao đơn hàng, liên hệ xác nhận, hỗ trợ bảo hành, chăm sóc khách hàng và gửi thông báo liên quan đến đơn hàng.',
      ],
    },
    {
      title: '3. Chia sẻ thông tin',
      body: [
        'Thông tin chỉ được chia sẻ cho đơn vị vận chuyển và cổng thanh toán ở mức cần thiết để hoàn tất đơn hàng, hoặc khi có yêu cầu hợp lệ của cơ quan nhà nước. Chúng tôi không bán thông tin cá nhân cho bên thứ ba.',
      ],
    },
    {
      title: '4. Bảo mật',
      body: [
        'Mật khẩu được mã hoá một chiều trước khi lưu. Chúng tôi áp dụng các biện pháp kỹ thuật hợp lý để hạn chế truy cập trái phép, tuy nhiên không có hệ thống nào an toàn tuyệt đối.',
      ],
    },
    {
      title: '5. Quyền của bạn',
      body: [
        'Bạn có thể xem và chỉnh sửa thông tin trong mục "Tài khoản", hoặc yêu cầu chúng tôi xoá/điều chỉnh dữ liệu cá nhân bằng cách liên hệ trực tiếp.',
      ],
    },
    {
      title: '6. Liên hệ',
      body: [
        `Mọi thắc mắc về quyền riêng tư, vui lòng liên hệ ${store}${settings.hotline ? ` — Hotline: ${settings.hotline}` : ''}${settings.email ? ` — Email: ${settings.email}` : ''}.`,
      ],
    },
  ]

  const sections = type === 'terms' ? TERMS : PRIVACY
  const title = type === 'terms' ? 'Điều khoản sử dụng' : 'Chính sách bảo mật'

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5 text-sm text-gray-600 leading-relaxed">
          {sections.map((s) => (
            <section key={s.title}>
              <h3 className="font-semibold text-gray-800 mb-1.5">{s.title}</h3>
              <div className="space-y-2">
                {s.body.map((para, i) => <p key={i}>{para}</p>)}
              </div>
            </section>
          ))}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-medium hover:bg-[#1557b0] transition"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}

export default LegalModal
