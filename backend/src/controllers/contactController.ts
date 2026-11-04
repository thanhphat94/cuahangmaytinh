import ApiError from '../helpers/ApiError';
import catchAsync from '../helpers/catchAsync';
import * as contactService from '../services/contactService';

type ContactInput = Parameters<typeof contactService.createContact>[0];

export const createContact = catchAsync(async (req, res) => {
  const body = (req.body ?? {}) as Partial<ContactInput>;
  // Đã đăng nhập → dùng họ tên/email/SĐT của tài khoản (không tin dữ liệu client gửi lên).
  const input: ContactInput = req.user
    ? { fullName: req.user.fullName, email: req.user.email, phone: req.user.phone, message: body.message ?? '' }
    : { fullName: body.fullName ?? '', email: body.email ?? '', phone: body.phone, message: body.message ?? '' };
  const result = await contactService.createContact(input, req.user?.id);
  res.status(201).json(result);
});

export const getContacts = catchAsync(async (_req, res) => {
  const contacts = await contactService.getContacts();
  res.json(contacts);
});

export const markAsRead = catchAsync(async (req, res) => {
  const contact = await contactService.markAsRead(req.params.id);
  res.json(contact);
});

export const deleteContact = catchAsync(async (req, res) => {
  const result = await contactService.deleteContact(req.params.id);
  res.json(result);
});

export const replyContact = catchAsync(async (req, res) => {
  const contact = await contactService.replyContact(req.params.id, req.body?.reply);
  res.json(contact);
});

export const getMyContacts = catchAsync(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  res.json(await contactService.getMyContacts(req.user.id, req.user.email));
});
