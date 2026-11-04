import { Award, Users, Truck, Headphones, CheckCircle, MapPin, Phone } from 'lucide-react'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { getStoreInitials } from '../utils/siteSettings'

const stats = [
  { number: '10+', label: 'Năm kinh nghiệm' },
  { number: '50K+', label: 'Khách hàng' },
  { number: '1000+', label: 'Sản phẩm' },
  { number: '99%', label: 'Khách hàng hài lòng' },
]

const values = [
  { icon: Award, title: 'Chất lượng', desc: 'Cam kết sản phẩm chính hãng 100%' },
  { icon: Truck, title: 'Giao hàng', desc: 'Nhanh chóng, đúng hẹn, miễn phí từ 500K' },
  { icon: Headphones, title: 'Hỗ trợ', desc: 'Tư vấn 24/7, hỗ trợ kỹ thuật tận tâm' },
  { icon: Users, title: 'Cộng đồng', desc: 'Hơn 50,000 khách hàng tin tưởng' },
]

const team = [
  { name: 'Nguyễn Văn A', role: 'Giám đốc', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
  { name: 'Trần Thị B', role: 'Quản lý', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
  { name: 'Lê Văn C', role: 'Kỹ thuật', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
]

function AboutPage() {
  const { settings } = useSiteSettings()

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] text-white py-16">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Về chúng tôi</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            {settings.storeName} - Đối tác tin cậy trong lĩnh vực thiết bị tin học và an ninh
          </p>
        </div>
      </div>

      <div className="container py-12 space-y-16">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <span className="text-3xl font-bold text-[#1a73e8]">{stat.number}</span>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">Câu chuyện của chúng tôi</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Được thành lập từ năm 2014, {settings.storeName} bắt đầu với tầm nhìn trở thành nhà cung cấp thiết bị tin học 
              hàng đầu tại Việt Nam. Qua hơn 10 năm phát triển, chúng tôi đã phục vụ hơn 50,000 khách hàng 
              với cam kết chất lượng và dịch vụ tận tâm.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Chúng tôi chuyên cung cấp camera an ninh, laptop, máy tính để bàn và máy in 
              từ các thương hiệu uy tín như Hikvision, Dahua, Uniarch, Pantum...
            </p>
          </div>
          <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#1a73e8] rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">{getStoreInitials(settings.storeName)}</span>
              </div>
              <p className="font-bold text-lg">{settings.storeName.toUpperCase()}</p>
              <p className="text-gray-500 text-sm">{settings.tagline}</p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-8">Giá trị cốt lõi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-lg transition">
                <div className="w-14 h-14 bg-[#1a73e8]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <value.icon size={28} className="text-[#1a73e8]" />
                </div>
                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-gray-500 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-8">Đội ngũ của chúng tôi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-center">
                <img src={member.image} alt={member.name} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="font-bold">{member.name}</h3>
                  <p className="text-gray-500 text-sm">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-[#1a1a2e] rounded-xl p-8 md:p-12 text-white">
          <h2 className="text-2xl font-bold text-center mb-8">Tại sao chọn {settings.storeName}?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Sản phẩm chính hãng 100%',
              'Giá cả cạnh tranh',
              'Bảo hành 12-24 tháng',
              'Hỗ trợ kỹ thuật tận tâm',
              'Giao hàng nhanh chóng',
              'Đổi trả trong 7 ngày',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle size={20} className="text-[#ff6b00] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Liên hệ với chúng tôi</h2>
          <p className="text-gray-500 mb-6">Hãy để chúng tôi đồng hành cùng bạn trong hành trình công nghệ</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href={`tel:${settings.hotline.replace(/\s/g, '')}`} className="flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-lg font-bold hover:bg-[#1557b0] transition">
              <Phone size={18} />
              {settings.hotline}
            </a>
            <a href="/contact" className="flex items-center gap-2 px-6 py-3 border-2 border-[#1a73e8] text-[#1a73e8] rounded-lg font-bold hover:bg-[#1a73e8] hover:text-white transition">
              <MapPin size={18} />
              Đến cửa hàng
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutPage
