import { Truck, Shield, Headphones, RotateCcw, type LucideIcon } from 'lucide-react'

type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
}

const services: Service[] = [
  {
    icon: Truck,
    title: 'Giao hàng nhanh',
    description: 'Miễn phí ship đơn từ 500K',
  },
  {
    icon: Shield,
    title: 'Bảo hành chính hãng',
    description: 'Bảo hành 12-24 tháng',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ 24/7',
    description: 'Tư vấn miễn phí',
  },
  {
    icon: RotateCcw,
    title: 'Đổi trả dễ dàng',
    description: '7 ngày đổi trả miễn phí',
  },
]

function ServiceBanner() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
        {services.map((service, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-6 hover:bg-gray-50 transition"
          >
            <div className="w-12 h-12 bg-[#1a73e8]/10 rounded-xl flex items-center justify-center shrink-0">
              <service.icon size={24} className="text-[#1a73e8]" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">{service.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServiceBanner
