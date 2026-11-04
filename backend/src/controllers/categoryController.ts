import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import * as categoryService from '../services/categoryService';

export const getCategories = catchAsync(async (_req, res) => {
  const categories = await categoryService.getCategories();
  res.json(categories);
});

export const getCategoryBySlug = catchAsync(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);
  if (!category) throw ApiError.notFound('Không tìm thấy danh mục');
  res.json(category);
});
