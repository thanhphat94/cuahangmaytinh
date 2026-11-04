import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

const CART_PRODUCT_SELECT = {
  id: true, name: true, slug: true, price: true,
  originalPrice: true, images: true, stock: true, isActive: true,
} as const;

type CartItemRow = Prisma.CartItemGetPayload<{
  include: { product: { select: typeof CART_PRODUCT_SELECT } };
}>;

type CartItemInput = {
  productId: string;
  quantity?: number | string;
  variant?: string | null;
};

type LocalCartItemInput = {
  productId?: string;
  _id?: string;
  id?: string;
  quantity?: number | string;
  variant?: string | null;
};

const parseQuantity = (value: number | string | undefined, fallback = 1): number => {
  const quantity = Number(value ?? fallback);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw ApiError.badRequest('Số lượng phải là số nguyên từ 1 đến 99');
  }
  return quantity;
};

export const getCart = async (userId: string) => {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { select: CART_PRODUCT_SELECT } },
    orderBy: { createdAt: 'asc' },
  });
  return items
    .filter((item) => item.product.isActive && item.product.price > 0)
    .map((item: CartItemRow) => ({
      _id: item.product.id,
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      originalPrice: item.product.originalPrice,
      image: item.product.images?.[0] || '',
      images: item.product.images,
      stock: item.product.stock,
      quantity: item.quantity,
      variant: item.variant,
      cartItemId: item.id,
    }));
};

export const addToCart = async (userId: string, { productId, quantity = 1, variant = null }: CartItemInput) => {
  const qty = parseQuantity(quantity);
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product || product.price <= 0) throw ApiError.notFound('Sản phẩm không tồn tại hoặc chưa có giá bán');
  if (product.stock < 1) throw ApiError.badRequest('Sản phẩm đã hết hàng');

  const normalizedVariant = variant || '';
  await prisma.$transaction(async (tx) => {
    const key = { userId_productId_variant: { userId, productId, variant: normalizedVariant } };
    const current = await tx.cartItem.findUnique({ where: key });
    const nextQuantity = (current?.quantity ?? 0) + qty;
    if (nextQuantity > product.stock) {
      throw ApiError.badRequest(`Sản phẩm chỉ còn ${product.stock} cái trong kho`);
    }
    await tx.cartItem.upsert({
      where: key,
      create: { userId, productId, quantity: qty, variant: normalizedVariant },
      update: { quantity: nextQuantity },
    });
  });
  return getCart(userId);
};

export const updateCartItem = async (userId: string, productId: string, { quantity, variant = null }: Omit<CartItemInput, 'productId'>) => {
  const qty = parseQuantity(quantity);
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { stock: true } });
  if (!product) throw ApiError.notFound('Không tìm thấy sản phẩm');
  if (qty > product.stock) throw ApiError.badRequest(`Sản phẩm chỉ còn ${product.stock} cái trong kho`);
  const result = await prisma.cartItem.updateMany({
    where: { userId, productId, variant: variant || '' },
    data: { quantity: qty },
  });
  if (result.count === 0) throw ApiError.notFound('Sản phẩm không có trong giỏ hàng');
  return getCart(userId);
};

export const removeFromCart = async (userId: string, productId: string, variant?: string | null) => {
  await prisma.cartItem.deleteMany({ where: { userId, productId, variant: variant || '' } });
  return getCart(userId);
};

export const clearCart = async (userId: string) => {
  await prisma.cartItem.deleteMany({ where: { userId } });
  return [];
};

/** Merge a guest cart into the account cart; clamp quantities to current stock. */
export const syncCart = async (userId: string, localItems: LocalCartItemInput[]) => {
  if (!Array.isArray(localItems) || localItems.length > 100) {
    throw ApiError.badRequest('Danh sách giỏ hàng không hợp lệ');
  }

  const merged = new Map<string, { productId: string; variant: string; quantity: number }>();
  for (const item of localItems) {
    const productId = item.productId || item._id || item.id;
    if (!productId || typeof productId !== 'string') continue;
    const quantity = parseQuantity(item.quantity);
    const variant = item.variant || '';
    const key = `${productId}::${variant}`;
    const current = merged.get(key);
    merged.set(key, { productId, variant, quantity: Math.min(99, (current?.quantity ?? 0) + quantity) });
  }

  await prisma.$transaction(async (tx) => {
    const productIds = [...new Set([...merged.values()].map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true, price: { gt: 0 }, stock: { gt: 0 } },
      select: { id: true, stock: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of merged.values()) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const key = { userId_productId_variant: { userId, productId: item.productId, variant: item.variant } };
      const current = await tx.cartItem.findUnique({ where: key });
      const quantity = Math.min(product.stock, (current?.quantity ?? 0) + item.quantity, 99);
      await tx.cartItem.upsert({
        where: key,
        create: { userId, productId: item.productId, quantity, variant: item.variant },
        update: { quantity },
      });
    }
  });

  return getCart(userId);
};
