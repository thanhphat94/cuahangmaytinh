import { prisma } from '../config/db';
import ApiError from '../helpers/ApiError';

type ContactInput = {
  fullName: string;
  email: string;
  phone?: string | null;
  message: string;
};

export const createContact = async ({ fullName, email, phone, message }: ContactInput, userId?: string) => {
  const name = (fullName ?? '').toString().trim();
  const mail = (email ?? '').toString().trim();
  const body = (message ?? '').toString().trim();
  if (!name) throw ApiError.badRequest('Vui lòng nhập họ tên');
  if (!/^\S+@\S+\.\S+$/.test(mail)) throw ApiError.badRequest('Email không hợp lệ');
  if (body.length < 5) throw ApiError.badRequest('Vui lòng nhập nội dung liên hệ');
  if (body.length > 3000) throw ApiError.badRequest('Nội dung quá dài (tối đa 3000 ký tự)');

  const contact = await prisma.contact.create({
    data: { fullName: name, email: mail, phone: phone?.toString().trim() || null, message: body, userId: userId ?? null },
  });
  return { message: 'Gửi liên hệ thành công', contact: { ...contact, _id: contact.id } };
};

export const getContacts = async () => {
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return contacts.map((c) => ({ ...c, _id: c.id }));
};

export const markAsRead = async (id: string) => {
  const contact = await prisma.contact.update({
    where: { id },
    data: { isRead: true },
  });
  return { ...contact, _id: contact.id };
};

export const deleteContact = async (id: string) => {
  try {
    await prisma.contact.delete({ where: { id } });
    return { message: 'Đã xoá liên hệ' };
  } catch {
    throw ApiError.notFound('Không tìm thấy liên hệ');
  }
};

// Admin ghi câu trả lời → lưu vào DB, tự đánh dấu đã đọc.
export const replyContact = async (id: string, reply: unknown) => {
  const text = (reply ?? '').toString().trim();
  if (text.length < 2) throw ApiError.badRequest('Vui lòng nhập nội dung trả lời');
  if (text.length > 3000) throw ApiError.badRequest('Nội dung trả lời quá dài (tối đa 3000 ký tự)');
  try {
    const contact = await prisma.contact.update({
      where: { id },
      data: { reply: text, repliedAt: new Date(), isRead: true },
    });
    return { ...contact, _id: contact.id };
  } catch {
    throw ApiError.notFound('Không tìm thấy liên hệ');
  }
};

// Liên hệ của chính người dùng đang đăng nhập (kèm câu trả lời nếu có).
// Khớp theo tài khoản, hoặc theo email để lấy luôn các liên hệ gửi trước khi có tính năng này.
export const getMyContacts = async (userId: string, email: string) => {
  const contacts = await prisma.contact.findMany({
    where: { OR: [{ userId }, { email: { equals: email, mode: 'insensitive' } }] },
    orderBy: { createdAt: 'desc' },
    select: { id: true, message: true, reply: true, repliedAt: true, createdAt: true },
  });
  return contacts;
};
