/**
 * Import laptop thật từ file data/Thunderbit_laptop.json vào database.
 * (Cùng định dạng 3 file Thunderbit_pc / camera / mayin.)
 *
 * Chạy từ thư mục backend/:   npm run import:laptops
 *
 * Script làm 4 việc:
 *   1. Với dòng chưa có "Hình ảnh sản phẩm": mở trang sản phẩm, lấy ảnh ở thẻ og:image,
 *      rồi ghi ngược vào file JSON (lần sau không cần tải lại). Cần có Internet.
 *   2. Tạo danh mục "Laptop" (slug: laptop) nếu chưa có.
 *   3. Upsert từng laptop theo slug (chạy lại nhiều lần không bị trùng).
 *   4. Tự gán TAGS + THÔNG SỐ (CPU, RAM, ổ cứng, card, màn hình) suy ra từ tên máy
 *      để chatbot tư vấn lọc theo nghề nghiệp / ưu tiên.
 *
 * Nếu trước đó bạn đã chạy bản dữ liệu mẫu (seed:laptops) thì các máy mẫu đó sẽ được ẩn đi.
 */
import 'dotenv/config';
import fs from 'fs';
import https from 'https';
import path from 'path';
import type { IncomingMessage } from 'http';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const FILE = path.join(__dirname, 'data', 'Thunderbit_laptop.json');

/** Một dòng trong file JSON Thunderbit (toàn bộ giá trị đều là chuỗi) */
type ThunderbitItem = {
  'Tên sản phẩm': string;
  'URL sản phẩm': string;
  'Hình ảnh sản phẩm': string;
  'Giá (VND)': string;
  'Tình trạng hàng': string;
  'Thương hiệu': string;
};

type Specs = {
  cpu: string;
  ram: string;
  ssd: string;
  gpu: string;
  screen: string;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Chuyển kết quả JSON.parse (unknown) thành danh sách dòng hợp lệ */
function readItems(raw: unknown, filePath: string): ThunderbitItem[] {
  if (!Array.isArray(raw)) {
    throw new Error(`File JSON không phải một mảng: ${filePath}`);
  }
  return raw.map((row) => {
    if (!isRecord(row)) {
      throw new Error(`Dòng sản phẩm không hợp lệ trong ${filePath}`);
    }
    return {
      'Tên sản phẩm': asText(row['Tên sản phẩm']),
      'URL sản phẩm': asText(row['URL sản phẩm']),
      'Hình ảnh sản phẩm': asText(row['Hình ảnh sản phẩm']),
      'Giá (VND)': asText(row['Giá (VND)']),
      'Tình trạng hàng': asText(row['Tình trạng hàng']),
      'Thương hiệu': asText(row['Thương hiệu']),
    };
  });
}

// Slug của 13 laptop MẪU ở bản trước -> sẽ bị ẩn
const OLD_SAMPLE_SLUGS = [
  'acer-aspire-3-a315', 'asus-vivobook-go-15', 'lenovo-ideapad-slim-3-15', 'hp-15-fd-series',
  'dell-inspiron-14', 'lenovo-thinkpad-e14-gen-6', 'asus-zenbook-14-oled', 'macbook-air-13-m3',
  'lenovo-loq-15iax9', 'acer-nitro-v-15', 'asus-vivobook-pro-15-oled', 'asus-tuf-gaming-f15',
  'macbook-pro-14-m3-pro',
];

// ─── 1. Lấy ảnh từ trang sản phẩm ───────────────────────────────────────────

function httpGet(url: string, redirects = 3): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (DoAn2 importer)' }, timeout: 15000 }, (res: IncomingMessage) => {
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      if (status >= 300 && status < 400 && location && redirects > 0) {
        res.resume();
        return resolve(httpGet(new URL(location, url).href, redirects - 1));
      }
      if (status !== 200) { res.resume(); return reject(new Error('HTTP ' + status)); }
      let html = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { html += chunk; });
      res.on('end', () => resolve(html));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/** Lấy link ảnh từ <meta property="og:image" content="..."> (không phụ thuộc thứ tự thuộc tính) */
export function extractOgImage(html: string): string {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (/property=["']og:image["']/i.test(tag)) {
      const m = tag.match(/content=["']([^"']+)["']/i);
      if (m) return m[1];
    }
  }
  return '';
}

async function fillMissingImages(items: ThunderbitItem[]): Promise<void> {
  const missing = items.filter((it) => !it['Hình ảnh sản phẩm']);
  if (missing.length === 0) return;
  console.log(`🖼  Đang lấy ảnh cho ${missing.length} laptop chưa có ảnh...`);
  let ok = 0;
  for (const it of missing) {
    try {
      const img = extractOgImage(await httpGet(it['URL sản phẩm']));
      if (img) { it['Hình ảnh sản phẩm'] = img; ok++; }
    } catch (e) {
      console.warn(`  ⚠ Không lấy được ảnh: ${it['Tên sản phẩm'].slice(0, 50)}... (${errorMessage(e)})`);
    }
    await new Promise((r) => setTimeout(r, 300)); // nghỉ chút cho nhẹ server
  }
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf-8'); // lưu lại cho lần sau
  console.log(`  ✔ Lấy được ${ok}/${missing.length} ảnh (đã lưu vào file JSON)\n`);
}

// ─── 4. Suy ra thông số và tags từ tên máy ─────────────────────────────────

export function parseSpecs(name: string): Specs {
  const n = name.replace(/[″”“]/g, '"');
  const cpu =
    (n.match(/Core\s*Ultra\s*\d+\s*[\w-]*/i) ||
     n.match(/Ryzen\s*\d\s*[\w-]+/i) ||
     n.match(/\bR[3579]-\w+/i) ||
     n.match(/Core\s*[357]\s*[-\s]?\d{3}\w*/i) ||
     n.match(/Core\s*i[3579][-\s]?\d{3,5}\w*/i) ||
     n.match(/\bi[3579]\s*-?\d{4,5}\w*/i) ||
     n.match(/Intel\s*N\d+/i) || [''])[0].trim();
  const ram = (n.match(/(\d{1,2})\s*G[BD]/i) || [])[1];
  const ssd = (n.match(/\b(128|256|512)\s*GB\b/i) || n.match(/\b([12])\s*TB\b/i) || []);
  const gpu = (n.match(/RTX\s*\d{4}/i) || n.match(/\b(4060|4050|3050)\b/) || [])[0];
  const screen = (n.match(/(\d{2}(?:\.\d)?)\s*(?:inch|")/i) || [])[1];
  return {
    cpu,
    ram: ram ? `${ram}GB` : '',
    ssd: ssd[0] ? (ssd[0].match(/tb/i) ? ssd[0].replace(/\s+/g, '') : `${ssd[1]}GB`) : '',
    gpu: gpu ? (/^\d/.test(gpu) ? `RTX ${gpu}` : gpu.toUpperCase().replace(/\s+/, ' ')) : 'Card đồ họa tích hợp',
    screen: screen ? `${screen} inch` : '',
  };
}

/**
 * Luật gán tags (đây là "bộ não" của chatbot tư vấn):
 *   gaming     : tên có Gaming/Victus/Legion/Nitro/LOQ hoặc card RTX
 *   hieu-nang  : gaming, hoặc CPU dòng H (…H, …HS, …HX) + RAM >= 16GB
 *   do-hoa     : card RTX 4xxx, ZenBook/OLED, hoặc CPU dòng H + RAM >= 16GB
 *   lap-trinh  : RAM >= 16GB, CPU từ i5/Core 5/Ryzen 5 trở lên, giá >= 15 triệu
 *   sinh-vien  : không gaming và giá <= 18 triệu (hoặc gaming giá <= 19 triệu: sinh viên IT/đồ họa nhẹ)
 *   van-phong  : mọi máy không phải gaming
 *   mong-nhe   : màn hình 14 inch (hoặc Zenbook/Flip), không gaming
 *   pin-trau   : CPU dòng U (tiết kiệm điện), không gaming
 */
export function inferTags(name: string, price: number, specs: Specs): string[] {
  const n = name.toLowerCase();
  const ramGB = parseInt(specs.ram) || 0;
  const cpu = specs.cpu.toLowerCase();
  const isGaming = /gaming|victus|legion|nitro|loq|rtx/.test(n);
  const isH = /\d{3,5}(h|hs|hx)\b/.test(cpu) || /\b(r7-8745h)\b/.test(cpu);
  const isU = /\d{3,5}u\b/.test(cpu) || /\d{3}u\b/.test(cpu);
  const midCpu = /(i[579]|core\s*[57]|core\s*ultra|ryzen\s*[579]|r[579]-)/.test(cpu);
  const tags = new Set<string>();

  if (isGaming) { tags.add('gaming'); tags.add('hieu-nang'); }
  else {
    tags.add('van-phong');
    if (/\b14(\.0)?\s*(inch|")/.test(n) || /zenbook|flip/.test(n)) tags.add('mong-nhe');
    if (isU) tags.add('pin-trau');
  }
  if (isH && ramGB >= 16) { tags.add('hieu-nang'); if (!isGaming || /rtx\s*40/.test(n)) tags.add('do-hoa'); }
  if (/rtx\s*40|zenbook|oled/.test(n)) tags.add('do-hoa');
  if (ramGB >= 16 && midCpu && price >= 15000000) tags.add('lap-trinh');
  if ((!isGaming && price <= 18000000) || (isGaming && price <= 19000000)) tags.add('sinh-vien');
  return [...tags];
}

// ─── Mapping JSON -> Product ────────────────────────────────────────────────

const extractSlug = (url: string): string => url.replace(/\/$/, '').split('/').pop() ?? '';

function mapItem(item: ThunderbitItem, categoryId: string): { product: Prisma.ProductUncheckedCreateInput; specs: Specs } {
  const name = item['Tên sản phẩm'].replace(/\s+-\s*Cái$/i, '').trim();
  const price = parseInt(item['Giá (VND)'].replace(/\D/g, ''), 10) || 0;
  const specs = parseSpecs(name);
  const slug = extractSlug(item['URL sản phẩm']);
  const image = item['Hình ảnh sản phẩm'];
  const brand = item['Thương hiệu'] || null;
  return {
    product: {
      name, slug, sku: slug, brand,
      categoryId, price,
      images: image ? [image] : [],
      stock: /hết/i.test(item['Tình trạng hàng']) ? 0 : 10,
      unit: 'Cái', warranty: '12 tháng', isActive: true,
      shortDescription: [specs.cpu, specs.ram, specs.ssd, specs.gpu].filter(Boolean).join(' · '),
      tags: inferTags(name, price, specs),
    },
    specs,
  };
}

async function main(): Promise<void> {
  const items = readItems(JSON.parse(fs.readFileSync(FILE, 'utf-8')), FILE);
  await fillMissingImages(items);

  const category = await prisma.category.upsert({
    where: { slug: 'laptop' },
    update: {},
    create: { name: 'Laptop', slug: 'laptop', description: 'Laptop văn phòng, học tập, đồ họa, gaming', isActive: true },
  });
  console.log(`📂 Danh mục: ${category.name}`);

  let created = 0, updated = 0, failed = 0;
  for (const item of items) {
    try {
      const { product, specs } = mapItem(item, category.id);
      const result = await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          name: product.name, brand: product.brand, price: product.price, images: product.images,
          stock: product.stock, shortDescription: product.shortDescription, tags: product.tags,
          categoryId: category.id,
        },
        create: product,
      });
      result.createdAt.getTime() === result.updatedAt.getTime() ? created++ : updated++;

      // Thông số kỹ thuật: xoá cũ, tạo lại
      await prisma.productSpec.deleteMany({ where: { productId: result.id } });
      const specRows: Array<[string, string]> = [['CPU', specs.cpu], ['RAM', specs.ram], ['Ổ cứng', specs.ssd],
                    ['Card đồ họa', specs.gpu], ['Màn hình', specs.screen]];
      const rows = specRows
        .filter(([, value]) => value)
        .map(([key, value]) => ({ productId: result.id, key, value }));
      if (rows.length) await prisma.productSpec.createMany({ data: rows });
    } catch (e) {
      failed++;
      console.warn(`  ⚠ Lỗi "${item['Tên sản phẩm'].slice(0, 50)}": ${errorMessage(e)}`);
    }
  }

  // Ẩn 13 laptop mẫu của bản trước (nếu có)
  const hidden = await prisma.product.updateMany({ where: { slug: { in: OLD_SAMPLE_SLUGS } }, data: { isActive: false } });
  if (hidden.count) console.log(`🙈 Đã ẩn ${hidden.count} laptop mẫu cũ`);

  console.log(`\n🎉 Hoàn tất! Mới: ${created} | Cập nhật: ${updated} | Lỗi: ${failed}`);
}

if (require.main === module) {
  main()
    .catch((e: unknown) => { console.error('❌ Lỗi import:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
