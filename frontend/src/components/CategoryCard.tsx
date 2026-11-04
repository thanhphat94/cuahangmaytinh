import { Link } from 'react-router-dom'
import { Camera, Monitor, Cpu, Printer, Wifi, Headphones, type LucideIcon } from 'lucide-react'
import type { CategoryItem } from '../utils/constants'

const iconMap: Record<string, LucideIcon> = {
  Camera: Camera,
  Monitor: Monitor,
  Cpu: Cpu,
  Printer: Printer,
  Wifi: Wifi,
  Headphones: Headphones,
}

type Props = { category: CategoryItem }

function CategoryCard({ category }: Props) {
  const Icon = iconMap[category.icon] || Camera

  return (
    <Link
      to={`/category/${category.slug}`}
      className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 group border border-gray-100"
    >
      <div className="w-16 h-16 bg-[#1a73e8]/10 rounded-xl flex items-center justify-center group-hover:bg-[#1a73e8] transition-colors">
        <Icon size={28} className="text-[#1a73e8] group-hover:text-white transition-colors" />
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-[#1a73e8] transition-colors">
        {category.name}
      </span>
    </Link>
  )
}

export default CategoryCard
