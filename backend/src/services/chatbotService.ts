import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

// Nghề nghiệp / nhu cầu -> tag của laptop (tag được gán trong dữ liệu sản phẩm)
const JOB_TAG: Record<string, string> = {
  'sinh-vien': 'sinh-vien',
  'van-phong': 'van-phong',
  'lap-trinh': 'lap-trinh',
  'do-hoa':    'do-hoa',
  'game':      'gaming',
};
const JOB_LABEL: Record<string, string> = {
  'sinh-vien': 'sinh viên',
  'van-phong': 'nhân viên văn phòng',
  'lap-trinh': 'lập trình viên',
  'do-hoa':    'thiết kế đồ họa / dựng video',
  'game':      'chơi game',
};
// Ưu tiên thêm -> tag
const PRIORITY_TAG: Record<string, string> = { 'mong-nhe': 'mong-nhe', 'pin-trau': 'pin-trau', 'hieu-nang': 'hieu-nang' };
const TAG_LABEL: Record<string, string> = {
  'sinh-vien': 'hợp sinh viên', 'van-phong': 'hợp làm văn phòng', 'lap-trinh': 'hợp lập trình',
  'do-hoa': 'hợp đồ họa', 'gaming': 'chơi game tốt', 'mong-nhe': 'mỏng nhẹ',
  'pin-trau': 'pin lâu', 'hieu-nang': 'hiệu năng mạnh',
};

type LaptopWithSpecs = Prisma.ProductGetPayload<{ include: { specs: true } }>;

type RecommendInput = {
  job?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  priority?: string;
};

const fmt = (n: number): string => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export const recommend = async ({ job, minPrice, maxPrice, priority }: RecommendInput) => {
  const min = Number(minPrice) || 0;
  const max = Number(maxPrice) || 0;
  const jobTag = job ? JOB_TAG[job] : undefined;
  const priTag = priority ? PRIORITY_TAG[priority] : undefined;

  // 1. Lấy laptop đang bán trong tầm giá
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    OR: [{ category: { slug: 'laptop' } }, { name: { contains: 'laptop', mode: 'insensitive' } }],
  };
  if (min > 0 || max > 0) {
    const price: Prisma.FloatFilter = {};
    if (min > 0) price.gte = min;
    if (max > 0) price.lte = max;
    where.price = price;
  }
  const laptops = await prisma.product.findMany({ where, include: { specs: true } });

  // 2. Chấm điểm: đúng nhu cầu +3, đúng ưu tiên +2 (giá càng cao trong tầm giá thường cấu hình càng tốt)
  const scored = laptops.map((p: LaptopWithSpecs) => {
    const tags = p.tags || [];
    let score = 0;
    const matched: string[] = [];
    if (jobTag && tags.includes(jobTag)) { score += 3; matched.push(jobTag); }
    if (priTag && tags.includes(priTag)) { score += 2; matched.push(priTag); }
    return { p, score, matched };
  });
  scored.sort((a, b) => b.score - a.score || b.p.price - a.p.price);

  // 3. Chỉ giữ máy có điểm > 0; nếu không có thì lấy tạm các máy trong tầm giá
  let picked = scored.filter((x) => x.score > 0);
  let exact = true;
  if (picked.length === 0) { picked = scored; exact = false; }
  picked = picked.slice(0, 6);

  const products = picked.map(({ p, matched }) => {
    const spec = (k: string) => p.specs.find((s) => s.key === k)?.value;
    const cfg = [spec('CPU'), spec('RAM'), spec('Card đồ họa')].filter(Boolean).join(' · ');
    const why = matched.map((t) => TAG_LABEL[t]).join(', ');
    return { ...p, _id: p.id, reason: [why, cfg].filter(Boolean).join(' — ') };
  });

  // 4. Câu trả lời của chatbot
  const budgetText = max > 0 && min > 0 ? `từ ${fmt(min)} đến ${fmt(max)}`
    : max > 0 ? `dưới ${fmt(max)}` : min > 0 ? `từ ${fmt(min)} trở lên` : 'mọi mức giá';
  let message: string;
  if (products.length === 0) {
    message = `Rất tiếc, hiện cửa hàng chưa có laptop nào trong tầm giá ${budgetText}. Bạn thử nâng ngân sách một chút nhé!`;
  } else if (exact) {
    message = `Với nhu cầu ${(job && JOB_LABEL[job]) || 'của bạn'} và tầm giá ${budgetText}, mình gợi ý ${products.length} mẫu phù hợp nhất:`;
  } else {
    message = `Trong tầm giá ${budgetText} chưa có mẫu nào khớp hoàn toàn nhu cầu ${(job && JOB_LABEL[job]) || ''}, nhưng bạn có thể tham khảo các mẫu sau:`;
  }

  return { message, products, total: products.length, exact };
};
