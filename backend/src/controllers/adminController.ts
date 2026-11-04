import type { Prisma } from '@prisma/client';
import ApiError from '../helpers/ApiError';
import catchAsync from '../helpers/catchAsync';
import * as adminService from '../services/adminService';
import * as notificationService from '../services/notificationService';

// Kiểu input của service không export — suy ra trực tiếp từ chữ ký hàm để không trùng shape.
type UpdateOrderStatusInput = Parameters<typeof adminService.updateOrderStatus>[1];
type ShippingWebhookInput = Parameters<typeof adminService.handleShippingWebhook>[0];

// Query string luôn là string khi client gửi lên (axios không gửi tham số lặp).
// Giá trị khác (mảng/object) coi như không có -> service dùng mặc định.
const queryValue = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const getAllProducts = catchAsync(async (req, res) => {
  const result = await adminService.getAllProducts({
    category: queryValue(req.query.category),
    search: queryValue(req.query.search),
    page: queryValue(req.query.page),
    limit: queryValue(req.query.limit),
  });
  res.json(result);
});

export const createProduct = catchAsync(async (req, res) => {
  const product = await adminService.createProduct(req.body as Parameters<typeof adminService.createProduct>[0]);
  res.status(201).json(product);
});

export const updateProduct = catchAsync(async (req, res) => {
  const product = await adminService.updateProduct(req.params.id, req.body as Prisma.ProductUncheckedUpdateInput);
  res.json(product);
});

export const deleteProduct = catchAsync(async (req, res) => {
  const result = await adminService.deleteProduct(req.params.id);
  res.json(result);
});

export const getAllCategories = catchAsync(async (_req, res) => {
  const categories = await adminService.getAllCategories();
  res.json(categories);
});

export const createCategory = catchAsync(async (req, res) => {
  const cat = await adminService.createCategory(req.body as Prisma.CategoryUncheckedCreateInput);
  res.status(201).json(cat);
});

export const updateCategory = catchAsync(async (req, res) => {
  const cat = await adminService.updateCategory(req.params.id, req.body as Prisma.CategoryUncheckedUpdateInput);
  res.json(cat);
});

export const deleteCategory = catchAsync(async (req, res) => {
  const result = await adminService.deleteCategory(req.params.id);
  res.json(result);
});

export const getAllOrders = catchAsync(async (req, res) => {
  const result = await adminService.getAllOrders({
    status: queryValue(req.query.status),
    search: queryValue(req.query.search),
    page: queryValue(req.query.page),
    limit: queryValue(req.query.limit),
  });
  res.json(result);
});

export const updateOrderStatus = catchAsync(async (req, res) => {
  const order = await adminService.updateOrderStatus(req.params.id, req.body as UpdateOrderStatusInput);
  res.json(order);
});

// Nhận webhook từ đơn vị vận chuyển (GHN, GHTK, Viettel Post…)
// POST /api/webhook/shipping
// Body: { webhookToken, trackingStatus, statusLabel, location, note }
export const shippingWebhook = catchAsync(async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw ApiError.badRequest('Dữ liệu webhook không hợp lệ');
  const result = await adminService.handleShippingWebhook(req.body as ShippingWebhookInput);
  res.json(result);
});

export const createBanner = catchAsync(async (req, res) => {
  const banner = await adminService.createBanner(req.body as Prisma.BannerUncheckedCreateInput);
  res.status(201).json(banner);
});

export const updateBanner = catchAsync(async (req, res) => {
  const banner = await adminService.updateBanner(req.params.id, req.body as Prisma.BannerUncheckedUpdateInput);
  res.json(banner);
});

export const deleteBanner = catchAsync(async (req, res) => {
  const result = await adminService.deleteBanner(req.params.id);
  res.json(result);
});

export const deleteUser = catchAsync(async (req, res) => {
  const result = await adminService.deleteUser(req.params.id, req.user?.id);
  res.json(result);
});

export const seedSamplePosts = catchAsync(async (_req, res) => {
  const result = await adminService.seedSamplePosts();
  res.json(result);
});

export const getAllPosts = catchAsync(async (_req, res) => {
  const posts = await adminService.getAllPosts();
  res.json(posts);
});

export const createPost = catchAsync(async (req, res) => {
  const post = await adminService.createPost(req.body as Prisma.PostUncheckedCreateInput);
  res.status(201).json(post);
});

export const updatePost = catchAsync(async (req, res) => {
  const post = await adminService.updatePost(req.params.id, req.body as Prisma.PostUncheckedUpdateInput);
  res.json(post);
});

export const deletePost = catchAsync(async (req, res) => {
  const result = await adminService.deletePost(req.params.id);
  res.json(result);
});

export const getAllUsers = catchAsync(async (req, res) => {
  const result = await adminService.getAllUsers({
    page: queryValue(req.query.page),
    limit: queryValue(req.query.limit),
    role: queryValue(req.query.role),
    search: queryValue(req.query.search),
  });
  res.json(result);
});

export const toggleUserStatus = catchAsync(async (req, res) => {
  const result = await adminService.toggleUserStatus(req.params.id, req.user?.id);
  res.json(result);
});

export const getDashboardStats = catchAsync(async (_req, res) => {
  const stats = await adminService.getDashboardStats();
  res.json(stats);
});

export const getNotifications = catchAsync(async (_req, res) => {
  const notifications = await notificationService.getAdminNotifications();
  res.json(notifications);
});
