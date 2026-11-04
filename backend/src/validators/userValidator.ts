import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export const registerRules: ValidationChain[] = [
  body('fullName')
    .trim().notEmpty().withMessage('Họ tên không được để trống')
    .isLength({ max: 100 }).withMessage('Họ tên tối đa 100 ký tự'),

  body('email')
    .trim().isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),

  // ✅ FIX: Tăng từ min:6 lên min:8 + yêu cầu có chữ và số
  body('password')
    .isLength({ min: 8, max: 72 }).withMessage('Mật khẩu cần từ 8 đến 72 ký tự')
    .matches(/[a-zA-Z]/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ cái')
    .matches(/\d/).withMessage('Mật khẩu phải chứa ít nhất 1 chữ số'),

  body('phone')
    .optional()
    .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
];

export const loginRules: ValidationChain[] = [
  body('email').trim().isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').notEmpty().isLength({ max: 72 }).withMessage('Mật khẩu tối đa 72 ký tự'),
];

// ✅ NEW: Validate đổi mật khẩu
export const changePasswordRules: ValidationChain[] = [
  body('currentPassword').notEmpty().isLength({ max: 72 }).withMessage('Mật khẩu hiện tại không hợp lệ'),
  body('newPassword')
    .isLength({ min: 8, max: 72 }).withMessage('Mật khẩu mới cần từ 8 đến 72 ký tự')
    .matches(/[a-zA-Z]/).withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ cái')
    .matches(/\d/).withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ số'),
];
