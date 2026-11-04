import { prisma } from '../config/db';

export const getBanners = async () => {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return banners.map((b) => ({ ...b, _id: b.id }));
};
