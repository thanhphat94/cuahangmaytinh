import catchAsync from '../helpers/catchAsync';
import * as bannerService from '../services/bannerService';

export const getBanners = catchAsync(async (_req, res) => {
  const banners = await bannerService.getBanners();
  res.json(banners);
});
