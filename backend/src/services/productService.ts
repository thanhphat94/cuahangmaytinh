import type { Product } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const PRODUCT_CATEGORY_SELECT = { id: true, name: true, slug: true } as const;

type CategoryInfo = Pick<Product, 'id'> & { name: string; slug: string };
type ProductRow = Product & { category?: CategoryInfo | null };
type ProductListFilter = {
  category?: string;
  search?: string;
  brand?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  featured?: string;
  isNewProduct?: string;
  page?: string | number;
  limit?: string | number;
  sort?: string;
};

/**
 * Điều kiện chung cho mọi sản phẩm hiển thị với khách:
 * đang bán (isActive) VÀ có giá > 0. Sản phẩm giá 0đ (chưa nhập giá) sẽ không lộ ra
 * ở danh sách, tìm kiếm, khuyến mãi, trang chi tiết.
 */
const PUBLIC_WHERE = { isActive: true, price: { gt: 0 } } satisfies Prisma.ProductWhereInput;

// Helper: map over returned records
const mapId = (p: ProductRow) => {
  if (!p) return p;
  return { ...p, _id: p.id, categoryId: p.category ? { ...p.category, _id: p.category.id } : p.categoryId };
};

// ✅ FIX: Dùng PostgreSQL recursive CTE thay vì fetch toàn bộ category vào JS
const getAllSubcategoryIds = async (categoryId: string) => {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE sub AS (
      SELECT id FROM "Category" WHERE id = ${categoryId}
      UNION ALL
      SELECT c.id FROM "Category" c
      INNER JOIN sub ON c."parentId" = sub.id
    )
    SELECT id FROM sub
  `;
  return rows.map((r) => r.id);
};

// ✅ FIX: Map sort param → Prisma orderBy
const getSortOrder = (sort?: string): Prisma.ProductOrderByWithRelationInput => {
  switch (sort) {
    case 'price_asc':  return { price: 'asc' };
    case 'price_desc': return { price: 'desc' };
    case 'popular':    return { sold: 'desc' };
    case 'newest':
    default:           return { createdAt: 'desc' };
  }
};

// ════════════════════════════════════════════════════════════
//  TÌM KIẾM THÔNG MINH
//  - Bỏ dấu tiếng Việt:  "máy tính" = "may tinh" = "maytinh"
//  - Nhận diện nhóm:     "pc", "máy tính" → danh mục máy tính; "camera" → camera...
//  - Khớp theo TỪ (đầu từ), nên "pc" không còn dính "IPC" của camera
//  - Chỉ tìm trong tên / hãng / mã SKU / tên danh mục (không tìm trong mô tả dài
//    vì mô tả chứa đủ thứ từ khoá gây ra kết quả sai)
// ════════════════════════════════════════════════════════════

/** Bỏ dấu, đ→d, chữ thường, chỉ giữ chữ-số và khoảng trắng. */
export const normalizeVN = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Từ khoá → nhóm sản phẩm (slug danh mục). Viết KHÔNG DẤU, có thể có khoảng trắng. */
const SEARCH_INTENTS: { slugs: string[]; phrases: string[] }[] = [
  {
    slugs: ['may-tinh-pc'],
    phrases: ['pc', 'may tinh de ban', 'may tinh ban', 'may tinh bo', 'may bo', 'desktop', 'mini pc', 'all in one', 'aio', 'workstation', 'may chu', 'server'],
  },
  {
    slugs: ['laptop'],
    phrases: ['laptop', 'lap top', 'may tinh xach tay', 'notebook', 'macbook'],
  },
  {
    slugs: ['may-tinh-pc', 'laptop'],
    phrases: ['may tinh', 'maytinh', 'computer', 'vi tinh'],
  },
  {
    slugs: ['camera-quan-sat'],
    phrases: ['camera', 'cam', 'camera quan sat', 'quan sat', 'camera an ninh', 'an ninh', 'cctv', 'dau ghi', 'nvr', 'dvr'],
  },
  {
    slugs: ['may-in'],
    phrases: ['may in', 'mayin', 'printer', 'in laser', 'in phun'],
  },
];

type IndexedProduct = {
  row: ProductRow;
  words: string[];   // các từ đã chuẩn hoá của tên + hãng + sku + danh mục
  compact: string;   // chuỗi liền không khoảng trắng (để khớp "maytinh" với "may tinh")
  categorySlug: string;
};

const CACHE_MS = 60_000;
let searchCache: { at: number; items: IndexedProduct[] } | null = null;

/** Gọi khi admin sửa sản phẩm nếu muốn kết quả tìm kiếm cập nhật ngay (không bắt buộc). */
export const invalidateSearchCache = (): void => {
  searchCache = null;
};

const loadSearchIndex = async (): Promise<IndexedProduct[]> => {
  if (searchCache && Date.now() - searchCache.at < CACHE_MS) return searchCache.items;

  const rows = await prisma.product.findMany({
    where: PUBLIC_WHERE,
    include: { category: { select: PRODUCT_CATEGORY_SELECT } },
  });

  const items: IndexedProduct[] = rows.map((row) => {
    const text = normalizeVN(
      [row.name, row.brand ?? '', row.sku ?? '', row.category?.name ?? ''].join(' ')
    );
    return {
      row,
      words: text.split(' ').filter(Boolean),
      compact: text.replace(/\s/g, ''),
      categorySlug: row.category?.slug ?? '',
    };
  });

  searchCache = { at: Date.now(), items };
  return items;
};

/** Một từ khoá khớp sản phẩm nếu là ĐẦU của một từ nào đó (hoặc khớp chuỗi liền với từ khoá dài). */
const tokenMatches = (item: IndexedProduct, token: string): boolean => {
  if (item.words.some((w) => w.startsWith(token))) return true;
  // "maytinh" ↔ "may tinh": chỉ áp dụng cho từ khoá đủ dài để không khớp bừa
  return token.length >= 5 && item.compact.includes(token);
};

/** Tìm xem câu tìm kiếm có mở đầu bằng một từ khoá nhóm (vd "may tinh dell") không. */
const detectIntent = (tokens: string[]): { slugs: string[]; rest: string[] } | null => {
  const maxN = Math.min(3, tokens.length);
  for (let n = maxN; n >= 1; n--) {
    const candidate = tokens.slice(0, n).join('');
    for (const intent of SEARCH_INTENTS) {
      if (intent.phrases.some((p: string) => p.replace(/\s/g, '') === candidate)) {
        return { slugs: intent.slugs, rest: tokens.slice(n) };
      }
    }
  }
  return null;
};

const sortRows = (rows: ProductRow[], sort?: string): ProductRow[] => {
  const copy = [...rows];
  switch (sort) {
    case 'price_asc':  return copy.sort((a, b) => a.price - b.price);
    case 'price_desc': return copy.sort((a, b) => b.price - a.price);
    case 'popular':    return copy.sort((a, b) => b.sold - a.sold);
    case 'newest':
    default:           return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
};

const searchInMemory = async (search: string): Promise<IndexedProduct[]> => {
  const q = normalizeVN(search);
  if (!q) return [];
  const tokens = q.split(' ');
  const all = await loadSearchIndex();

  const intent = detectIntent(tokens);
  if (intent) {
    const slugSet = new Set(intent.slugs);
    const byCategory = all.filter(
      (it) => slugSet.has(it.categorySlug) && intent.rest.every((t) => tokenMatches(it, t))
    );
    if (byCategory.length > 0 || intent.rest.length > 0) return byCategory;
    // Danh mục chưa có sản phẩm (hoặc slug khác) → rơi xuống tìm theo từ khoá thường
  }

  return all.filter((it) => tokens.every((t) => tokenMatches(it, t)));
};

export const getProducts = async ({ category, search, brand, minPrice, maxPrice, featured, isNewProduct, page = 1, limit = 12, sort }: ProductListFilter) => {
  const p = Math.max(1, parseInt(String(page), 10) || 1);
  const l = Math.min(200, parseInt(String(limit), 10) || 12);
  const skip = (p - 1) * l;

  const min = Number(minPrice), max = Number(maxPrice);

  // ── Có từ khoá tìm kiếm → dùng bộ tìm kiếm thông minh (lọc trong bộ nhớ) ──
  if (search && search.trim()) {
    let matched = (await searchInMemory(search)).map((it) => it.row);

    if (category) {
      const ids = new Set(await getAllSubcategoryIds(category));
      matched = matched.filter((r) => ids.has(r.categoryId));
    }
    if (brand) matched = matched.filter((r) => (r.brand ?? '').toLowerCase() === brand.toLowerCase());
    if (min > 0) matched = matched.filter((r) => r.price >= min);
    if (max > 0) matched = matched.filter((r) => r.price <= max);
    if (featured === 'true') matched = matched.filter((r) => r.isFeatured);
    if (isNewProduct === 'true') matched = matched.filter((r) => r.isNewProduct);

    const sorted = sortRows(matched, sort);
    return {
      products: sorted.slice(skip, skip + l).map(mapId),
      total: sorted.length,
      totalPages: Math.ceil(sorted.length / l),
      currentPage: p,
    };
  }

  // ── Không tìm kiếm → truy vấn DB như cũ (có thêm điều kiện giá > 0) ──
  const where: Prisma.ProductWhereInput = { ...PUBLIC_WHERE };
  if (category) {
    const categoryIds = await getAllSubcategoryIds(category);
    where.categoryId = { in: categoryIds };
  }
  if (brand) where.brand = { equals: brand, mode: 'insensitive' };
  // Lọc theo khoảng giá (luôn giữ price > 0)
  if (min > 0 || max > 0) {
    const price: Prisma.FloatFilter = { gt: 0 };
    if (min > 0) price.gte = min;
    if (max > 0) price.lte = max;
    where.price = price;
  }
  if (featured === 'true') where.isFeatured = true;
  if (isNewProduct === 'true') where.isNewProduct = true;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: PRODUCT_CATEGORY_SELECT } },
      orderBy: getSortOrder(sort),   // ✅ dùng sort param
      skip,
      take: l,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map(mapId),
    total,
    totalPages: Math.ceil(total / l),
    currentPage: p,
  };
};

export const getFeaturedProducts = async () => {
  const featured = await prisma.product.findMany({
    where: { ...PUBLIC_WHERE, isFeatured: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (featured.length >= 12) return featured.map(mapId);

  const weekSeed = getWeekSeed();
  const needed = 16 - featured.length;
  const featuredIds = featured.map((p: Product) => p.id);
  const total = await prisma.product.count({ where: { ...PUBLIC_WHERE, isFeatured: false } });
  const skip = total > needed ? (weekSeed * needed) % Math.max(1, total - needed) : 0;

  const extra = await prisma.product.findMany({
    where: { ...PUBLIC_WHERE, id: { notIn: featuredIds } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: needed,
  });

  return [...featured, ...extra].map(mapId);
};

export const getNewProducts = async () => {
  const newProds = await prisma.product.findMany({
    where: { ...PUBLIC_WHERE, isNewProduct: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (newProds.length >= 12) return newProds.map(mapId);

  const weekSeed = getWeekSeed() + 7;
  const needed = 16 - newProds.length;
  const newIds = newProds.map((p: Product) => p.id);
  const total = await prisma.product.count({ where: { ...PUBLIC_WHERE, isNewProduct: false } });
  const skip = total > needed ? ((weekSeed * needed) + 13) % Math.max(1, total - needed) : 0;

  const extra = await prisma.product.findMany({
    where: { ...PUBLIC_WHERE, id: { notIn: newIds } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: needed,
  });

  return [...newProds, ...extra].map(mapId);
};

export const getDiscountedProducts = async (limit = 20) => {
  // ✅ FIX: Dùng raw query để filter originalPrice > price ngay trong DB (và bỏ giá 0đ)
  const discounted = await prisma.$queryRaw<Product[]>`
    SELECT * FROM "Product"
    WHERE "isActive" = true
      AND "price" > 0
      AND "originalPrice" IS NOT NULL
      AND "originalPrice" > "price"
    ORDER BY ("originalPrice" - "price") DESC
    LIMIT ${limit}
  `;

  if (discounted.length >= 8) return discounted.map(mapId);

  // Bổ sung nếu chưa đủ 8 sản phẩm giảm giá
  const ids = discounted.map((p: Product) => p.id);
  const extra = await prisma.product.findMany({
    where: { ...PUBLIC_WHERE, id: { notIn: ids } },
    orderBy: { createdAt: 'desc' },
    take: Math.max(0, 8 - discounted.length),
  });

  return [...discounted.map(mapId), ...extra.map(mapId)];
};

export const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: { ...PUBLIC_WHERE, slug },
    include: {
      category: { select: PRODUCT_CATEGORY_SELECT },
      specs: true,
    },
  });
  if (!product) return null;

  // ✅ FIX: Fire-and-forget viewCount — không block response
  prisma.product.update({
    where: { id: product.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {}); // bỏ qua lỗi, không critical

  return mapId(product);
};

function getWeekSeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}
