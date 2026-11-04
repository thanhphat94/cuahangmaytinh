import crypto from 'crypto';
import https from 'https';
import qs from 'qs';
import { env } from '../config/env';

const BACKEND_URL = env.backendUrl;

type ParamValue = string | number;
type Params = Record<string, ParamValue>;

/** Sort key-preserving helper — thứ tự key quyết định chuỗi ký, không được đổi. */
const sortParams = (params: Record<string, unknown>): Record<string, unknown> => {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(params).sort()) {
    sorted[k] = params[k];
  }
  return sorted;
};


const safeHexEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left.toLowerCase(), 'hex');
  const b = Buffer.from(right.toLowerCase(), 'hex');
  return /^[0-9a-f]+$/i.test(left) && /^[0-9a-f]+$/i.test(right) && a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ═══════════════════════════════════════════════════════════
// VNPay
// ═══════════════════════════════════════════════════════════
type VNPayCreateInput = {
  orderCode: string;
  amount: number;
  orderInfo?: string;
  ipAddr?: string;
};

export const createVNPayUrl = ({ orderCode, amount, orderInfo, ipAddr }: VNPayCreateInput): string => {
  const tmnCode   = env.vnpay.tmnCode;
  const secretKey = env.vnpay.hashSecret;
  if (!tmnCode || !secretKey) throw new Error('Thiếu cấu hình VNPay');

  const date = new Date();
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0');
  // VNPay timestamps are GMT+7 regardless of the server's host timezone.
  const toVNPayDate = (value: Date): string => {
    const vn = new Date(value.getTime() + 7 * 60 * 60 * 1000);
    return `${vn.getUTCFullYear()}${pad(vn.getUTCMonth() + 1)}${pad(vn.getUTCDate())}${pad(vn.getUTCHours())}${pad(vn.getUTCMinutes())}${pad(vn.getUTCSeconds())}`;
  };
  const createDate = toVNPayDate(date);
  const expireDate = toVNPayDate(new Date(date.getTime() + 15 * 60 * 1000));

  const params: Params = {
    vnp_Version:     '2.1.0',
    vnp_Command:     'pay',
    vnp_TmnCode:     tmnCode,
    vnp_Amount:      amount * 100,
    vnp_CurrCode:    'VND',
    vnp_TxnRef:      orderCode,
    vnp_OrderInfo:   orderInfo || `Thanh toan don hang ${orderCode}`,
    vnp_OrderType:   'other',
    vnp_Locale:      'vn',
    vnp_ReturnUrl:   `${BACKEND_URL}/api/payment/vnpay/return`,
    vnp_IpAddr:      ipAddr || '127.0.0.1',
    vnp_CreateDate:  createDate,
    vnp_ExpireDate:  expireDate,
  };

  const sorted = sortParams(params);
  const signData = qs.stringify(sorted, { encode: false });
  const hmac     = crypto.createHmac('sha512', secretKey).update(signData).digest('hex');

  return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${signData}&vnp_SecureHash=${hmac}`;
};

type VNPayVerifyResult =
  | { valid: false }
  | { valid: boolean; success: boolean; orderCode: string; amount: number };

export const verifyVNPayReturn = (query: Record<string, unknown>): VNPayVerifyResult => {
  const secretKey  = env.vnpay.hashSecret;
  if (!secretKey) return { valid: false };
  const { vnp_SecureHash, vnp_SecureHashType: _hashType, ...rest } = query;
  const sorted = sortParams(rest);
  const signData = qs.stringify(sorted, { encode: false });
  const hash     = crypto.createHmac('sha512', secretKey).update(signData).digest('hex');
  const received = typeof vnp_SecureHash === 'string' ? vnp_SecureHash : '';
  return {
    valid:     safeHexEqual(hash, received),
    success:   query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00',
    orderCode: String(query.vnp_TxnRef ?? ''),
    amount:    parseInt(String(query.vnp_Amount ?? ''), 10) / 100,
  };
};

// ═══════════════════════════════════════════════════════════
// MoMo
// ═══════════════════════════════════════════════════════════
type MoMoCreateInput = {
  orderCode: string;
  amount: number;
  orderInfo?: string;
};

type MoMoCreateResponse = {
  resultCode: number;
  message?: string;
  payUrl?: string;
};

export const createMoMoUrl = async ({ orderCode, amount, orderInfo }: MoMoCreateInput): Promise<string | undefined> => {
  const partnerCode = env.momo.partnerCode;
  const accessKey   = env.momo.accessKey;
  const secretKey   = env.momo.secretKey;
  if (!partnerCode || !accessKey || !secretKey) throw new Error('Thiếu cấu hình MoMo');

  const requestId   = `${partnerCode}-${Date.now()}`;
  const redirectUrl = `${BACKEND_URL}/api/payment/momo/return`;
  const ipnUrl      = `${BACKEND_URL}/api/payment/momo/ipn`;
  const requestType = 'payWithMethod';
  const extraData   = '';

  const rawHash = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderCode}&orderInfo=${orderInfo || `Thanh toan ${orderCode}`}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  const signature = crypto.createHmac('sha256', secretKey).update(rawHash).digest('hex');

  const body = {
    partnerCode, requestId, amount, orderId: orderCode,
    orderInfo: orderInfo || `Thanh toan ${orderCode}`,
    redirectUrl, ipnUrl, requestType, extraData,
    lang: 'vi', signature,
  };

  const result = await new Promise<MoMoCreateResponse>((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname: 'test-payment.momo.vn',
      port: 443, path: '/v2/gateway/api/create',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => { raw += chunk; });
      res.on('end', () => resolve(JSON.parse(raw) as MoMoCreateResponse));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  if (result.resultCode !== 0) throw new Error(result.message || 'MoMo tạo thanh toán thất bại');
  return result.payUrl;
};

type MoMoVerifyResult = {
  valid: boolean;
  success: boolean;
  orderCode: string;
  amount: number;
};

// MoMo v2 signs a documented, fixed field sequence. Sorting object keys is incorrect.
const MOMO_SIGNATURE_FIELDS = [
  'accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo',
  'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime',
  'resultCode', 'transId',
] as const;

export const verifyMoMoIPN = (body: Record<string, unknown>): MoMoVerifyResult | { valid: false } => {
  const secretKey = env.momo.secretKey;
  if (!secretKey || !env.momo.partnerCode || !env.momo.accessKey) return { valid: false };

  const received = typeof body.signature === 'string' ? body.signature : '';
  const rawHash = MOMO_SIGNATURE_FIELDS
    .map((field) => `${field}=${body[field] === undefined || body[field] === null ? '' : String(body[field])}`)
    .join('&');
  const expected = crypto.createHmac('sha256', secretKey).update(rawHash).digest('hex');
  const amount = Number(body.amount);
  const valid =
    String(body.partnerCode ?? '') === env.momo.partnerCode &&
    String(body.accessKey ?? '') === env.momo.accessKey &&
    Number.isFinite(amount) && amount >= 0 &&
    safeHexEqual(expected, received);

  return {
    valid,
    success: String(body.resultCode) === '0',
    orderCode: String(body.orderId ?? ''),
    amount,
  };
};
