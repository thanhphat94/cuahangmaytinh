import ApiError from '../helpers/ApiError';
import catchAsync from '../helpers/catchAsync';
import * as addressService from '../services/addressService';

type AddressInput = Parameters<typeof addressService.addAddress>[1];

export const getAddresses = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  const addresses = await addressService.getAddresses(userId);
  res.json(addresses);
});

export const addAddress = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  const addresses = await addressService.addAddress(userId, req.body as AddressInput);
  res.status(201).json(addresses);
});

export const updateAddress = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  const addresses = await addressService.updateAddress(userId, req.params.id, req.body as AddressInput);
  res.json(addresses);
});

export const deleteAddress = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();
  const addresses = await addressService.deleteAddress(userId, req.params.id);
  res.json(addresses);
});
