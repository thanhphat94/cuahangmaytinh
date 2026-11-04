import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env';

// Tạo transporter — hỗ trợ Gmail và SMTP tuỳ chỉnh
const createTransporter = (): Transporter => {
  const host = env.smtp.host;
  const auth = { user: env.smtp.user, pass: env.smtp.pass };

  // Nếu dùng Gmail
  if (!host || host.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth,
    });
  }

  // SMTP tuỳ chỉnh (Resend, Mailgun, SendGrid...)
  return nodemailer.createTransport({
    host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth,
  });
};

const FROM = `"Cửa Hàng Máy Tính" <${env.smtp.user || 'no-reply@cuahangmaytinh.vn'}>`;
const SITE_URL = env.clientUrl;

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);

type PasswordResetEmailInput = {
  to: string;
  fullName: string;
  resetToken: string;
};

type OrderEmailItem = {
  name?: string | null;
  quantity?: number | null;
  price?: number | null;
};

type OrderConfirmationEmailInput = {
  to: string;
  fullName: string;
  orderCode: string;
  items: OrderEmailItem[];
  finalAmount: number;
  paymentMethod: string;
};

export const sendPasswordResetEmail = async ({ to, fullName, resetToken }: PasswordResetEmailInput): Promise<void> => {
  const transporter = createTransporter();
  const resetUrl = `${SITE_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: '[Cửa Hàng Máy Tính] Đặt lại mật khẩu',
    html: `
      <div style="font-family:Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:#1a73e8;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">Cửa Hàng Máy Tính</h1>
        </div>
        <div style="padding:32px">
          <h2 style="font-size:18px;color:#1f2937;margin-top:0">Xin chào ${escapeHtml(fullName)},</h2>
          <p style="color:#6b7280;line-height:1.6">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>Nhấn vào nút bên dưới để tiếp tục:</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#1a73e8;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px">Link có hiệu lực trong <strong>30 phút</strong>.<br>Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px;margin:0">© ${new Date().getFullYear()} Cửa Hàng Máy Tính. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    `,
  });
};

export const sendOrderConfirmationEmail = async ({ to, fullName, orderCode, items, finalAmount, paymentMethod }: OrderConfirmationEmailInput): Promise<void> => {
  const transporter = createTransporter();
  const paymentLabels: Record<string, string> = { cod: 'Thanh toán khi nhận hàng (COD)', bank_transfer: 'Chuyển khoản ngân hàng', momo: 'Ví MoMo', vnpay: 'VNPay' };

  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151">${escapeHtml(i.name)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;text-align:center">x${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#1a73e8;text-align:right;font-weight:600">${((i.price ?? 0) * (i.quantity ?? 0)).toLocaleString('vi-VN')}đ</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `[Cửa Hàng Máy Tính] Xác nhận đơn hàng #${escapeHtml(orderCode)}`,
    html: `
      <div style="font-family:Roboto,Arial,sans-serif;max-width:580px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:#1a73e8;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">Cửa Hàng Máy Tính</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#16a34a;margin-top:0">✓ Đặt hàng thành công!</h2>
          <p style="color:#6b7280">Xin chào <strong>${escapeHtml(fullName)}</strong>, đơn hàng <strong>#${escapeHtml(orderCode)}</strong> của bạn đã được tiếp nhận.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead><tr><th style="text-align:left;padding:8px 0;border-bottom:2px solid #e5e7eb;color:#374151">Sản phẩm</th><th style="padding:8px 0;border-bottom:2px solid #e5e7eb;color:#374151">SL</th><th style="text-align:right;padding:8px 0;border-bottom:2px solid #e5e7eb;color:#374151">Thành tiền</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot><tr><td colspan="2" style="padding:12px 0;font-weight:700;color:#1f2937">Tổng thanh toán</td><td style="padding:12px 0;text-align:right;font-weight:700;color:#ff6b00;font-size:17px">${finalAmount.toLocaleString('vi-VN')}đ</td></tr></tfoot>
          </table>
          <p style="color:#6b7280;margin:0"><strong>Phương thức:</strong> ${escapeHtml(paymentLabels[paymentMethod] || paymentMethod)}</p>
          <p style="color:#6b7280;margin-top:8px">Chúng tôi sẽ liên hệ xác nhận và giao hàng sớm nhất!</p>
        </div>
      </div>
    `,
  });
};
