/**
 * Import sản phẩm từ 3 file JSON cào bằng Thunderbit vào PostgreSQL (qua Prisma)
 * ─────────────────────────────────────────────────────────────────────────────
 * Cách dùng:
 *   1. File script:        backend/src/scripts/importThunderbitProducts.ts
 *   2. Thư mục dữ liệu:    backend/src/scripts/data/
 *   3. 3 file JSON gốc nằm trong thư mục data/ ở trên, giữ nguyên tên:
 *        - Thunderbit_pc.json
 *        - Thunderbit_camera.json
 *        - Thunderbit_mayin.json
 *   4. Đảm bảo backend/.env đã có DATABASE_URL trỏ đúng PostgreSQL
 *   5. Chạy từ thư mục backend/:
 *        npx tsx src/scripts/importThunderbitProducts.ts
 *
 * Script này dùng prisma.upsert() theo "slug" sản phẩm:
 *   - Sản phẩm chưa có  -> tạo mới (kèm danh mục tương ứng)
 *   - Sản phẩm đã có    -> chỉ cập nhật giá / tồn kho / ảnh / tên / thương hiệu,
 *     KHÔNG đụng tới các trường admin tự chỉnh tay (isFeatured, description...)
 *   => chạy lại nhiều lần (mỗi lần cào lại) không bị trùng / không bị mất dữ liệu.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const DATA_DIR = path.join(__dirname, 'data');

/** Một dòng trong file JSON Thunderbit (toàn bộ giá trị đều là chuỗi) */
type ThunderbitItem = {
  'Tên sản phẩm': string;
  'URL sản phẩm': string;
  'Hình ảnh sản phẩm': string;
  'Giá (VND)': string;
  'Tình trạng hàng': string;
  'Thương hiệu': string;
};

type ImportGroup = {
  file: string;
  categorySlug: string;
  categoryName: string;
  categoryDesc: string;
};

// Khai báo 3 nhóm dữ liệu + danh mục tương ứng trong DB
const IMPORT_GROUPS: ImportGroup[] = [
  {
    file: 'Thunderbit_pc.json',
    categorySlug: 'may-tinh-pc',
    categoryName: 'Máy tính & PC',
    categoryDesc: 'Máy tính để bàn, Mini PC, All-in-One, Workstation',
  },
  {
    file: 'Thunderbit_camera.json',
    categorySlug: 'camera-quan-sat',
    categoryName: 'Camera quan sát',
    categoryDesc: 'Camera IP, Wifi, PTZ, NVR, phụ kiện camera',
  },
  {
    file: 'Thunderbit_mayin.json',
    categorySlug: 'may-in',
    categoryName: 'Máy in',
    categoryDesc: 'Máy in laser, đa năng, in 2 mặt các hãng',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

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

/** Lấy slug từ URL sản phẩm, vd: .../san-pham/abc-xyz/ -> "abc-xyz" */
function extractSlug(url: string): string {
  return url.replace(/\/$/, '').split('/').pop() ?? '';
}

/** Parse giá "9990000" -> 9990000 ; rỗng (liên hệ tư vấn) -> 0 */
function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr.trim() === '') return 0;
  return parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
}

/** Map tình trạng hàng -> số lượng tồn kho ước lượng */
function parseStock(status: string): number {
  if (status === 'Còn hàng') return 20;
  if (status === 'Hết hàng') return 0;
  return 0; // "Liên hệ tư vấn" hoặc trạng thái khác
}

function mapToProductData(item: ThunderbitItem, categoryId: string): Prisma.ProductUncheckedCreateInput {
  const slug = extractSlug(item['URL sản phẩm']);
  const price = parsePrice(item['Giá (VND)']);
  const stock = parseStock(item['Tình trạng hàng']);
  const brand = item['Thương hiệu'] || null;
  const image = item['Hình ảnh sản phẩm'];
  const name = item['Tên sản phẩm'];

  return {
    slug,
    name,
    sku: slug,
    brand,
    categoryId,
    price,
    images: image ? [image] : [],
    stock,
    unit: 'Cái',
    isActive: true,
    shortDescription: name,
    tags: brand ? [brand] : [],
  };
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('⏳ Kết nối PostgreSQL qua Prisma...');
  await prisma.$connect();
  console.log('✅ Đã kết nối\n');

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalFailed = 0;

  for (const group of IMPORT_GROUPS) {
    const filePath = path.join(DATA_DIR, group.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ Không tìm thấy ${filePath} — bỏ qua nhóm "${group.categoryName}"`);
      continue;
    }

    // 1. Upsert danh mục (tạo nếu chưa có, giữ nguyên nếu đã có)
    const category = await prisma.category.upsert({
      where: { slug: group.categorySlug },
      update: {},
      create: {
        name: group.categoryName,
        slug: group.categorySlug,
        description: group.categoryDesc,
        isActive: true,
      },
    });
    console.log(`📂 Danh mục: ${category.name} (${category.id})`);

    // 2. Đọc JSON
    const items = readItems(JSON.parse(fs.readFileSync(filePath, 'utf-8')), filePath);
    console.log(`📦 Đang import ${items.length} sản phẩm từ ${group.file}...`);

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const data = mapToProductData(item, category.id);

        const result = await prisma.product.upsert({
          where: { slug: data.slug },
          update: {
            name: data.name,
            brand: data.brand,
            price: data.price,
            images: data.images,
            stock: data.stock,
          },
          create: data,
        });

        // createdAt === updatedAt (cùng thời điểm) => bản ghi vừa được tạo mới
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      } catch (err) {
        failed++;
        console.warn(`  ⚠ Lỗi với "${item['Tên sản phẩm']}": ${errorMessage(err)}`);
      }
    }

    console.log(`  ✔ Mới: ${created} | Cập nhật: ${updated} | Lỗi: ${failed}\n`);
    totalCreated += created;
    totalUpdated += updated;
    totalFailed += failed;
  }

  console.log('🎉 Hoàn tất!');
  console.log(`   Tổng thêm mới   : ${totalCreated}`);
  console.log(`   Tổng cập nhật   : ${totalUpdated}`);
  console.log(`   Tổng lỗi/bỏ qua : ${totalFailed}`);
}

main()
  .catch((err: unknown) => {
    console.error('❌ Lỗi import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
