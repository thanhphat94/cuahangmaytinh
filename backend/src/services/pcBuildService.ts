import type { PcBuild, PcBuildComponent, Product } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

type ProductInfo = Pick<Product, 'id' | 'name' | 'price' | 'images' | 'slug'>;
type ComponentRow = PcBuildComponent & { product?: ProductInfo | null };
type BuildRow = PcBuild & { components?: ComponentRow[] };

type FormattedComponent = {
  _id: string;
  productId: (ProductInfo & { _id: string }) | string | null;
  name: string | null;
  price: number | null;
};

type ComponentInput = {
  productId?: string | null;
  name?: string | null;
  price?: number | null;
};

type PcBuildInput = {
  name?: string;
  components?: Record<string, ComponentInput | null> | null;
  totalPrice?: number;
  isPublic?: boolean | null;
};

const formatPcBuild = (build?: BuildRow | null) => {
  if (!build) return build;

  const { components, ...rest } = build;
  const formatted: Omit<BuildRow, 'components'> & {
    _id: string;
    components: Record<string, FormattedComponent>;
  } = {
    ...rest,
    _id: build.id,
    components: {},
  };

  if (components && Array.isArray(components)) {
    components.forEach(c => {
      let productData: (ProductInfo & { _id: string }) | string | null = c.productId;
      if (c.product) {
        productData = { ...c.product, _id: c.product.id };
      }

      formatted.components[c.type] = {
        _id: c.id,
        productId: productData,
        name: c.name,
        price: c.price
      };
    });
  }
  return formatted;
};

const parseComponents = (components?: Record<string, ComponentInput | null> | null) => {
  const componentsArray: Prisma.PcBuildComponentUncheckedCreateWithoutPcBuildInput[] = [];
  if (components) {
    for (const [type, data] of Object.entries(components)) {
      if (data && (data.productId || data.name)) {
        componentsArray.push({
          type,
          productId: data.productId || null,
          name: data.name || null,
          price: data.price || 0
        });
      }
    }
  }
  return componentsArray;
};

export const createPcBuild = async ({ name, components, totalPrice, isPublic }: PcBuildInput, userId?: string | null) => {
  const componentsArray = parseComponents(components);

  const build = await prisma.pcBuild.create({
    data: {
      userId: userId || null,
      name,
      totalPrice: totalPrice || 0,
      isPublic: isPublic || false,
      components: {
        create: componentsArray
      }
    },
    include: {
      components: true
    }
  });

  return formatPcBuild(build);
};

export const getMyPcBuilds = async (userId: string) => {
  const builds = await prisma.pcBuild.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { components: true }
  });

  return builds.map(formatPcBuild);
};

export const getPcBuildById = async (id: string) => {
  const build = await prisma.pcBuild.findUnique({
    where: { id },
    include: {
      components: {
        include: {
          product: {
            select: { id: true, name: true, price: true, images: true, slug: true }
          }
        }
      }
    }
  });

  return formatPcBuild(build);
};

export const updatePcBuild = async (id: string, userId: string, { name, components, totalPrice, isPublic }: PcBuildInput) => {
  const buildCheck = await prisma.pcBuild.findFirst({
    where: { id, userId }
  });

  if (!buildCheck) {
    throw ApiError.notFound('Không tìm thấy hoặc bạn không có quyền chỉnh sửa');
  }

  const componentsArray = parseComponents(components);

  await prisma.pcBuildComponent.deleteMany({
    where: { pcBuildId: id }
  });

  const updatedBuild = await prisma.pcBuild.update({
    where: { id },
    data: {
      name,
      totalPrice: totalPrice || 0,
      isPublic: isPublic || false,
      components: {
        create: componentsArray
      }
    },
    include: {
      components: true
    }
  });

  return formatPcBuild(updatedBuild);
};

export const deletePcBuild = async (id: string, userId: string) => {
  const buildCheck = await prisma.pcBuild.findFirst({
    where: { id, userId }
  });

  if (!buildCheck) {
    throw ApiError.notFound('Không tìm thấy hoặc bạn không có quyền xóa');
  }

  await prisma.pcBuild.delete({
    where: { id }
  });

  return { message: 'Đã xóa cấu hình' };
};
