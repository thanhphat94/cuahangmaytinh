import { prisma } from '../config/db';

export const getCategories = async () => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  });
  return categories.map(c => ({ ...c, _id: c.id }));
};

export const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true }
  });
  if (!category) return null;
  return { ...category, _id: category.id };
};
