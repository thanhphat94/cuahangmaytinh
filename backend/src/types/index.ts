import type { User } from '@prisma/client';

/** Payload người dùng gắn lên `req.user` sau khi xác thực JWT. */
export type AuthUser = Pick<
  User,
  'id' | 'fullName' | 'email' | 'phone' | 'role' | 'avatar' | 'isActive'
> & { _id: string };

/** Token đã ký của jsonwebtoken cho payload `{ id }`. */
export interface JwtPayload {
  id: string;
  tokenVersion: number;
  tokenType: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/** Envelope phản hồi API dùng chung — xem typescript/patterns.md. */
export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  meta?: ApiMeta;
};

/** Bộ lọc phân trang chuẩn của các danh sách admin. */
export interface PageQuery {
  page: number;
  limit: number;
}

/** Giá trị enum `role` trong Prisma schema (khai báo là String). */
export type UserRole = 'customer' | 'admin';
