import type { Post } from '@prisma/client';
import { prisma } from '../config/db';

export const getPosts = async () => {
  const posts = await prisma.post.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return posts.map((p: Post) => ({ ...p, _id: p.id }));
};

export const getPostBySlug = async (slug: string) => {
  const post = await prisma.post.findFirst({
    where: { slug, isActive: true },
  });
  return post ? { ...post, _id: post.id } : null;
};
