import catchAsync from '../helpers/catchAsync';
import ApiError from '../helpers/ApiError';
import * as pcBuildService from '../services/pcBuildService';

// Shape input lấy từ service (spec §9) — tránh trùng khai báo type.
type PcBuildInput = Parameters<typeof pcBuildService.createPcBuild>[0];

export const createPcBuild = catchAsync(async (req, res) => {
  const build = await pcBuildService.createPcBuild(req.body as PcBuildInput, req.user?.id);
  res.status(201).json(build);
});

export const getMyPcBuilds = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const builds = await pcBuildService.getMyPcBuilds(userId);
  res.json(builds);
});

export const getPcBuildById = catchAsync(async (req, res) => {
  const build = await pcBuildService.getPcBuildById(req.params.id);
  if (!build) throw ApiError.notFound('Không tìm thấy cấu hình');
  if (!build.isPublic && build.userId?.toString() !== req.user?.id.toString()) {
    throw ApiError.forbidden('Cấu hình này là riêng tư');
  }
  res.json(build);
});

export const updatePcBuild = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const build = await pcBuildService.updatePcBuild(req.params.id, userId, req.body as PcBuildInput);
  res.json(build);
});

export const deletePcBuild = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  const result = await pcBuildService.deletePcBuild(req.params.id, userId);
  res.json(result);
});
