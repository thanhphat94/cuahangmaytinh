import { prisma } from '../config/db';
import { env } from '../config/env';
import { seedSamplePosts } from './adminService';
import { getSettings } from './settingsService';

const DEFAULT_VOUCHERS = [
  { id: 'voucher-tinhoc10', code: 'TINHOC10', type: 'percent', value: 10, label: 'Giảm 10%', minOrder: 0 },
  { id: 'voucher-giam50k', code: 'GIAM50K', type: 'flat', value: 50000, label: 'Giảm 50.000đ', minOrder: 200000 },
  { id: 'voucher-freeship', code: 'FREESHIP', type: 'freeship', value: 0, label: 'Miễn phí vận chuyển', minOrder: 0 },
  { id: 'voucher-sale20', code: 'SALE20', type: 'percent', value: 20, label: 'Giảm 20% (đơn từ 1 triệu)', minOrder: 1000000 },
];

/**
 * Tạo dữ liệu mẫu cho bản demo khi các bảng còn trống. Chỉ chạy khi SEED_DEMO_DATA=true và
 * KHÔNG ghi đè dữ liệu đã có — an toàn khi chạy lại nhiều lần. Lỗi ở đây không làm sập server.
 */
export const bootstrapDemoData = async (): Promise<void> => {
  if (!env.seedDemoData) return;

  try {
    // 1) Voucher mặc định (bảng Voucher trống thì khách không thấy mã nào để chọn)
    if ((await prisma.voucher.count()) === 0) {
      await prisma.voucher.createMany({
        data: DEFAULT_VOUCHERS.map((v) => ({ ...v, active: true, usedCount: 0 })),
        skipDuplicates: true,
      });
      console.log('[demo] Đã tạo 4 voucher mặc định');
    }

    // 2) Tin tức mẫu (trang Admin → Tin tức trống thì không có gì để quản lý)
    if ((await prisma.post.count()) === 0) {
      const { created } = await seedSamplePosts();
      console.log(`[demo] Đã tạo ${created} tin tức mẫu`);
    }

    // 3) Thanh toán: ở chế độ mock, nếu cài đặt còn NGUYÊN TRẠNG mặc định (tắt hết + chưa nhập ngân hàng)
    //    thì bật MoMo / VNPay / chuyển khoản để demo. Admin đã chỉnh gì thì không đụng tới.
    if (env.payment.mode === 'mock') {
      await getSettings(); // đảm bảo đã có bản ghi cài đặt
      const settings = await prisma.siteSettings.findFirst();
      const pristine = settings
        && !settings.enableMomo && !settings.enableVnpay && !settings.enableBankTransfer
        && !settings.bankName.trim() && !settings.bankAccount.trim() && !settings.bankAccountName.trim();
      if (settings && pristine) {
        await prisma.siteSettings.update({
          where: { id: settings.id },
          data: {
            enableMomo: true,
            enableVnpay: true,
            enableBankTransfer: true,
            bankName: 'Vietcombank',
            bankAccount: '1234567890',
            bankAccountName: 'CUA HANG MAY TINH',
          },
        });
        console.log('[demo] Đã bật MoMo, VNPay và chuyển khoản (chế độ mock)');
      }
    }
  } catch (err) {
    console.error('[demo] Không tạo được dữ liệu mẫu:', err instanceof Error ? err.message : err);
  }
};
