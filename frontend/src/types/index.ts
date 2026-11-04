/**
 * Kiểu dữ liệu giao tiếp với backend (`backend/src/services/*`).
 *
 * Backend là Prisma + Express, mọi `DateTime` serialize thành `string`, `Float` thành `number`.
 * Các endpoint cũ vẫn trả kèm `_id` song song với `id` (di sản từ bản MongoDB) — giữ nguyên ở đây.
 */

/** Field danh sách PUBLIC_FIELDS trong `services/settingsService.ts`. */
export interface SiteSettings {
  storeName: string;
  tagline: string;
  email: string;
  phone: string;
  hotline: string;
  address: string;
  description: string;
  workingHours: string;
  defaultShippingFee: number;
  freeShippingFrom: number;
  enableCod: boolean;
  enableBankTransfer: boolean;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  enableMomo: boolean;
  enableVnpay: boolean;
}

export interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  level?: number;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string | null;
}

/**
 * `mapId()` trong `backend/src/services/productService.ts:23-25` biến `categoryId` thành
 * hai dạng tuỳ endpoint: object `{ id, name, slug, _id }` khi query `include` quan hệ
 * category, chuỗi id khi không include.
 */
export type ProductCategoryRef = Pick<Category, 'id' | 'name' | 'slug'> & { _id?: string };

export interface Product {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  sku?: string | null;
  brand?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  images: string[];
  price: number;
  originalPrice?: number | null;
  unit?: string;
  stock: number;
  warranty?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  isNewProduct?: boolean;
  tags?: string[];
  viewCount?: number;
  sold?: number;
  categoryId?: string | ProductCategoryRef;
  /** `PRODUCT_CATEGORY_SELECT` = `{ id, name, slug }`, không phải `Category` đầy đủ. */
  category?: ProductCategoryRef | null;
  /** Chỉ có khi endpoint `include` quan hệ (vd `GET /products/:slug`, `/chatbot/recommend`). */
  specs?: ProductSpec[];
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;

  /**
   * Field trình giao diện (badge "HOT/Giảm giá") mà `components/ProductCard.tsx` đọc.
   * Backend Prisma không trả các field này — `isHot`/`isNew`/`discount`/`status`/`image`
   * là di sản của bản MongoDB cũ, vì vậy để optional.
   */
  isHot?: boolean;
  isNew?: boolean;
  discount?: number | string | null;
  status?: string;
  image?: string | null;
}

/** `model ProductSpec` (`backend/prisma/schema.prisma:96-102`). */
export interface ProductSpec {
  id: string;
  productId: string;
  key: string;
  value: string;
}

/** `model ProductVariant` (`backend/prisma/schema.prisma:104-112`). */
export interface ProductVariant {
  id: string;
  productId: string;
  name?: string | null;
  sku?: string | null;
  price?: number | null;
  stock?: number | null;
  image?: string | null;
}

export interface User {
  id: string;
  _id?: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'admin';
  avatar?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

/**
 * Một dòng giỏ hàng. Khi đã đăng nhập, server trả về product đã chọn lọc + quantity;
 * khi chưa đăng nhập, item là sản phẩm đang có trong localStorage cộng `quantity`.
 */
export interface CartLine extends Partial<Product> {
  id: string;
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  images?: string[];
  slug?: string;
  stock?: number;
  variant?: string | null;
}

/** Wishlist khi chưa đăng nhập chỉ giữ đúng id sản phẩm. */
export interface WishlistEntry extends Partial<Product> {
  id: string;
  _id?: string;
}

export interface OrderItem {
  id?: string;
  productId?: string | null;
  product?: Product | null;
  name?: string | null;
  image?: string | null;
  price?: number | null;
  quantity?: number | null;
  variant?: string | null;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo' | 'vnpay';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Order {
  id: string;
  _id?: string;
  orderCode: string;
  userId?: string | null;
  customerFullName: string;
  customerEmail?: string | null;
  customerPhone: string;
  customerAddress: string;
  totalAmount: number;
  shippingFee: number;
  discount: number;
  finalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  guestAccessToken?: string | null;
  voucherCode?: string | null;
  note?: string | null;
  shippingProvider?: string | null;
  shippingProviderLabel?: string | null;
  shippingTrackingCode?: string | null;
  shippingDeliveredAt?: string | null;
  shippingFailedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
  /** Backend gắn thêm: 'member' = đã đăng nhập khi đặt, 'guest' = khách vãng lai. */
  customerType?: 'member' | 'guest';
  customerInfo?: { fullName?: string; phone?: string; email?: string; address?: string };
}

export interface Review {
  id: string;
  _id?: string;
  productId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  images?: string[];
  isApproved?: boolean;
  createdAt?: string;
  user?: Pick<User, 'id' | 'fullName' | 'avatar'> | null;
}

export interface Post {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  content?: string | null;
  thumbnail?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface Banner {
  id: string;
  _id?: string;
  title?: string | null;
  image: string;
  link?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

/** Voucher persisted in PostgreSQL and managed from the admin screen. */
export type VoucherType = 'percent' | 'flat' | 'freeship';

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  label: string;
  minOrder: number;
  active: boolean;
  usageLimit?: number | null;
  usedCount: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

/** Row `model PriceList` (`backend/prisma/schema.prisma:311-318`) — `/price-lists` trả nguyên bản. */
export interface PriceList {
  id: string;
  title: string;
  /** Tên file lưu trong `uploads/pricelists`. */
  filename: string;
  /** Tên gốc để hiển thị khi tải về. */
  originalName: string;
  size: number;
  createdAt: string;
}

export interface PcBuildComponent {
  id?: string;
  type: string;
  productId?: string | null;
  product?: Product | null;
  name?: string | null;
  price?: number | null;
}

export interface PcBuild {
  id: string;
  _id?: string;
  name: string;
  totalPrice: number;
  isPublic?: boolean;
  components: PcBuildComponent[];
  createdAt?: string;
}

export interface ContactMessage {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  isRead?: boolean;
  createdAt?: string;
}

/** Kết quả trả về từ `POST /api/chatbot`. */
/** `POST /chatbot/recommend` — xem `backend/src/services/chatbotService.ts:66-93`. */
export interface ChatbotReply {
  message: string;
  products: Array<Product & { reason?: string }>;
  total: number;
  /** `false` khi không có mẫu nào khớp tag, danh sách chỉ là gợi ý gần đúng. */
  exact: boolean;
}

/** Payload register/login — khớp `validators/userValidator.ts`. */
export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends Credentials {
  fullName: string;
  phone?: string;
}

/** Response của `/users/login`, `/users/register` và `/users/refresh-token`. */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  _id: string;
  id?: string;
  fullName: string;
  email: string;
  role: User['role'];
  avatar?: string | null;
}

/** Trạng thái slice `auth` trong Redux. */
export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
}

/** Bộ lọc danh sách sản phẩm gửi lên `/products`. */
/**
 * Tham số `GET /products` — đối chiếu `backend/src/controllers/productController.ts:15`
 * và `getSortOrder` trong `productService.ts:43-51`. Không có tham số `keyword`.
 */
export interface ProductFilters {
  category?: string;
  search?: string;
  brand?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  featured?: string;
  isNewProduct?: string;
  page?: number;
  limit?: number;
  /** Giá trị khác 4 lựa chọn trên sẽ rơi vào `default` của `getSortOrder` = `newest`. */
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | (string & {});
}

/** Envelope thật của `GET /products` (`{ products, total, totalPages, currentPage }`). */
export interface ProductListResult {
  products: Product[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/** Helper lấy id chuẩn hoá: dữ liệu cũ có `_id`, dữ liệu mới có `id`. */
export const entityId = (value: { id?: string; _id?: string }): string =>
  value._id ?? value.id ?? '';
