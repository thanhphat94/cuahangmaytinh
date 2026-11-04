import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import * as productService from '../services/productService';

// req.query có giá trị là union — thu hẹp tường minh, giữ đúng fallback gốc.
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

// page/limit: service tự `parseInt(String(x))`, nên truyền chuỗi thô để giữ
// nguyên phép ép kiểu cũ (kể cả khi query lặp lại thành mảng).
const asCoercedString = (value: unknown): string | undefined =>
  (value === undefined ? undefined : String(value));

export const getProducts = catchAsync(async (req, res) => {
  const { category, search, brand, minPrice, maxPrice, featured, isNewProduct, page, limit, sort } = req.query;
  const result = await productService.getProducts({
    category: asString(category),
    search: asString(search),
    brand: asString(brand),
    minPrice: asString(minPrice),
    maxPrice: asString(maxPrice),
    featured: asString(featured),
    isNewProduct: asString(isNewProduct),
    page: asCoercedString(page),
    limit: asCoercedString(limit),
    sort: asString(sort),
  });
  res.json(result);
});

export const getFeaturedProducts = catchAsync(async (_req, res) => {
  const products = await productService.getFeaturedProducts();
  res.json(products);
});

export const getNewProducts = catchAsync(async (_req, res) => {
  const products = await productService.getNewProducts();
  res.json(products);
});

export const getDiscountedProducts = catchAsync(async (req, res) => {
  const limit = parseInt(String(req.query.limit)) || 20;
  const products = await productService.getDiscountedProducts(limit);
  res.json(products);
});

export const getProductBySlug = catchAsync(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  if (!product) throw ApiError.notFound('Không tìm thấy sản phẩm');
  res.json(product);
});
