import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

type Props = {
  title: string;
  subtitle?: string;
  link?: string;
  showLink?: boolean;
}

function SectionTitle({ title, subtitle, link = '#', showLink = true }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {showLink && (
        <Link
          to={link}
          className="flex items-center gap-1 text-[#1a73e8] font-medium hover:text-[#ff6b00] transition text-sm"
        >
          Xem tất cả
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  )
}

export default SectionTitle
