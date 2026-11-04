import catchAsync from '../helpers/catchAsync';
import * as settingsService from '../services/settingsService';

export const getSettings = catchAsync(async (_req, res) => {
  const settings = await settingsService.getSettings();
  res.json(settings);
});

export const updateSettings = catchAsync(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  res.json(settings);
});
