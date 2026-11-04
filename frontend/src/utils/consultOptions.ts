// Các lựa chọn và hàm đọc câu chat tự do cho chatbot tư vấn laptop

/** Một phương án có id + từ khoá để khớp với câu chat tự do. */
export interface ConsultOption {
  id: string
  label: string
  words: string[]
}

/** Một khoảng ngân sách (VNĐ); `max: 0` nghĩa là không có trần. */
export interface BudgetOption {
  label: string
  min: number
  max: number
}

/** Phần trả lời trích ra được từ câu chat — chỉ chứa các field nhận diện được. */
export interface ConsultPatch {
  job?: string
  priority?: string
  min?: number
  max?: number
}

export const JOBS: ConsultOption[] = [
  { id: 'sinh-vien', label: '🎓 Sinh viên',            words: ['sinh viên', 'sinh vien', 'học sinh', 'hoc sinh'] },
  { id: 'van-phong', label: '💼 Nhân viên văn phòng',  words: ['văn phòng', 'van phong', 'kế toán', 'ke toan', 'nhân viên', 'nhan vien', 'kinh doanh'] },
  { id: 'lap-trinh', label: '👨‍💻 Lập trình viên',       words: ['lập trình', 'lap trinh', 'dev', 'code'] },
  { id: 'do-hoa',    label: '🎨 Thiết kế / Dựng video', words: ['đồ họa', 'đồ hoạ', 'do hoa', 'thiết kế', 'thiet ke', 'dựng', 'dung phim', 'video', 'photoshop', 'designer'] },
  { id: 'game',      label: '🎮 Chơi game',            words: ['game', 'gaming', 'chơi'] },
]

export const BUDGETS: BudgetOption[] = [
  { label: 'Dưới 10 triệu',  min: 0,        max: 10000000 },
  { label: '10 – 15 triệu',  min: 10000000, max: 15000000 },
  { label: '15 – 20 triệu',  min: 15000000, max: 20000000 },
  { label: '20 – 30 triệu',  min: 20000000, max: 30000000 },
  { label: 'Trên 30 triệu',  min: 30000000, max: 0 },
]

export const PRIORITIES: ConsultOption[] = [
  { id: 'mong-nhe',  label: '🪶 Mỏng nhẹ, hay mang đi', words: ['mỏng', 'nhẹ', 'mong nhe', 'mang đi'] },
  { id: 'pin-trau',  label: '🔋 Pin lâu',               words: ['pin'] },
  { id: 'hieu-nang', label: '🚀 Hiệu năng mạnh',        words: ['mạnh', 'hiệu năng', 'hieu nang', 'cấu hình cao'] },
  { id: '',          label: 'Không ưu tiên gì đặc biệt', words: [] },
]

// Đọc câu người dùng gõ, ví dụ: "mình là sinh viên, khoảng 15 triệu"
export function parseText(text: string): ConsultPatch {
  const t = text.toLowerCase()
  const result: ConsultPatch = {}

  const job = JOBS.find(j => j.words.some(w => t.includes(w)))
  if (job) result.job = job.id

  const pri = PRIORITIES.find(p => p.words.some(w => t.includes(w)))
  if (pri) result.priority = pri.id

  // Dạng khoảng: "10 - 15 triệu", "từ 10 đến 15 triệu"
  const range = t.match(/(\d+(?:[.,]\d+)?)\s*(?:-|–|đến|den)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|m)\b/)
  if (range) {
    const a = parseFloat(range[1].replace(',', '.')) * 1000000
    const b = parseFloat(range[2].replace(',', '.')) * 1000000
    result.min = Math.min(a, b); result.max = Math.max(a, b)
    return result
  }

  // Lấy các số kèm "triệu / tr / m"
  const nums = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|m)\b/g)]
    .map(m => parseFloat(m[1].replace(',', '.')) * 1000000)
  if (nums.length >= 2) {
    result.min = Math.min(nums[0], nums[1]); result.max = Math.max(nums[0], nums[1])
  } else if (nums.length === 1) {
    const n = nums[0]
    if (/dưới|duoi|tối đa|toi da/.test(t))      { result.min = 0; result.max = n }
    else if (/trên|tren|từ|tu\s/.test(t))        { result.min = n; result.max = 0 }
    else                                         { result.min = Math.round(n * 0.8); result.max = Math.round(n * 1.2) } // "khoảng"
  }
  return result
}
