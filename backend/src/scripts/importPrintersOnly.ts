/**
 * Import riêng 20 sản phẩm máy in từ Thunderbit_mayin.json.
 * Chỉ chạy khi đã kiểm tra PostgreSQL và xác nhận database chưa có sản phẩm máy in.
 * Chạy từ thư mục backend: npm run import:printers
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

type PrinterImportRow = {
  'Tên sản phẩm': string;
  'URL sản phẩm': string;
  'Hình ảnh sản phẩm': string;
  'Giá (VND)': string;
  'Tình trạng hàng': string;
  'Thương hiệu': string;
};

const DATA_FILE = path.join(__dirname, 'data', 'Thunderbit_mayin.json');
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const parsePrice = (value: string): number => Number(value.replace(/\D/g, '')) || 0;
const parseStock = (value: string): number => value.trim() === 'Còn hàng' ? 20 : 0;
const slugFromUrl = (value: string): string => {
  try {
    const pathname = new URL(value).pathname.replace(/\/$/, '');
    return pathname.split('/').pop() || '';
  } catch {
    return value.replace(/\/$/, '').split('/').pop() || '';
  }
};

async function main(): Promise<void> {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Không tìm thấy file dữ liệu: ${DATA_FILE}`);
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Thunderbit_mayin.json không phải một mảng.');

  const category = await prisma.category.upsert({
    where: { slug: 'may-in' },
    update: { name: 'Máy in', isActive: true },
    create: {
      name: 'Máy in',
      slug: 'may-in',
      description: 'Máy in laser, đa năng, in hai mặt các hãng',
      isActive: true,
    },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of parsed) {
    const row = raw as Partial<PrinterImportRow>;
    const name = text(row['Tên sản phẩm']);
    const slug = slugFromUrl(text(row['URL sản phẩm']));
    if (!name || !slug) {
      skipped++;
      continue;
    }

    const brand = text(row['Thương hiệu']) || null;
    const price = parsePrice(text(row['Giá (VND)']));
    const stock = parseStock(text(row['Tình trạng hàng']));
    const image = text(row['Hình ảnh sản phẩm']);
    const data: Prisma.ProductUncheckedCreateInput = {
      categoryId: category.id,
      name,
      slug,
      sku: slug,
      brand,
      price,
      images: image ? [image] : [],
      stock,
      unit: 'Cái',
      isActive: true,
      shortDescription: name,
      tags: brand ? [brand] : [],
    };

    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    await prisma.product.upsert({
      where: { slug },
      update: {
        categoryId: category.id,
        name,
        brand,
        price,
        images: data.images,
        stock,
        shortDescription: name,
      },
      create: data,
    });

    if (existing) updated++;
    else created++;
  }

  console.log(`Hoàn tất import máy in. Mới: ${created}; cập nhật: ${updated}; bỏ qua: ${skipped}.`);
  console.log(`Danh mục đích: ${category.name} (${category.slug})`);
}

main()
  .catch((error: unknown) => {
    console.error('[Import printers]', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
