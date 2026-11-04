import ApiError from '../helpers/ApiError';
import catchAsync from '../helpers/catchAsync';
import * as postService from '../services/postService';

export const getPosts = catchAsync(async (_req, res) => {
  const posts = await postService.getPosts();
  res.json(posts);
});

export const getPostBySlug = catchAsync(async (req, res) => {
  const post = await postService.getPostBySlug(req.params.slug);
  if (!post) throw ApiError.notFound('Không tìm thấy bài viết');
  res.json(post);
});
