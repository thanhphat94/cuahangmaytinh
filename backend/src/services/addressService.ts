import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

type AddressInput = {
  name: string;
  phone: string;
  address: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  isDefault?: boolean;
};

export const getAddresses = async (userId: string) => {
  const addresses = await prisma.address.findMany({
    where: { userId }
  });
  return addresses.map(addr => ({ ...addr, _id: addr.id }));
};

export const addAddress = async (userId: string, { name, phone, address, ward, district, province, isDefault }: AddressInput) => {
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });
  }

  await prisma.address.create({
    data: {
      userId,
      name,
      phone,
      address,
      ward,
      district,
      province,
      isDefault: isDefault || false
    }
  });

  const addresses = await prisma.address.findMany({ where: { userId } });
  return addresses.map(addr => ({ ...addr, _id: addr.id }));
};

export const updateAddress = async (userId: string, addressId: string, { name, phone, address, ward, district, province, isDefault }: AddressInput) => {
  const addr = await prisma.address.findUnique({
    where: { id: addressId }
  });

  if (!addr || addr.userId !== userId) {
    throw ApiError.notFound('Không tìm thấy địa chỉ');
  }

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });
  }

  await prisma.address.update({
    where: { id: addressId },
    data: { name, phone, address, ward, district, province, isDefault }
  });

  const addresses = await prisma.address.findMany({ where: { userId } });
  return addresses.map(a => ({ ...a, _id: a.id }));
};

export const deleteAddress = async (userId: string, addressId: string) => {
  const addr = await prisma.address.findUnique({
    where: { id: addressId }
  });

  if (!addr || addr.userId !== userId) {
    throw ApiError.notFound('Không tìm thấy địa chỉ');
  }

  await prisma.address.delete({
    where: { id: addressId }
  });

  const addresses = await prisma.address.findMany({ where: { userId } });
  return addresses.map(a => ({ ...a, _id: a.id }));
};
