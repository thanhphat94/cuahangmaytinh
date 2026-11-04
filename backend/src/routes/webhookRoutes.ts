/**
 * WEBHOOK ROUTES — Nhận callback từ đơn vị vận chuyển
 *
 * Trong thực tế, các đơn vị vận chuyển (GHN, GHTK, Viettel Post)
 * sẽ POST đến endpoint này mỗi khi trạng thái giao hàng thay đổi.
 *
 * Cấu hình webhook URL trên dashboard của đơn vị vận chuyển:
 *   https://yourdomain.com/api/webhook/shipping
 *
 * Body họ gửi sẽ khác nhau theo từng hãng — bạn cần normalize
 * về format chung trước khi gọi handleShippingWebhook.
 *
 * Hiện tại: dùng format chung (cả simulator từ admin cũng dùng format này)
 */
import { Router } from 'express';
import { shippingWebhook } from '../controllers/adminController';

const router = Router();

// POST /api/webhook/shipping
// Body: { webhookToken, trackingStatus, statusLabel, location, note }
//   webhookToken  : token sinh khi admin bấm "Bàn giao vận chuyển"
//   trackingStatus: 'picked_up' | 'in_transit' | 'delivered' | 'failed'
//   statusLabel   : chuỗi tiếng Việt mô tả trạng thái
//   location      : bưu cục / địa điểm hiện tại
//   note          : ghi chú thêm
router.post('/shipping', shippingWebhook);

export default router;
