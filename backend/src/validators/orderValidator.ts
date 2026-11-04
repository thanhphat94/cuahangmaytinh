import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export const createOrderRules: ValidationChain[] = [
  body('items').isArray({ min: 1 }).withMessage('Giỏ hàng không được rỗng'),
  body('items.*.productId').isUUID().withMessage('productId không hợp lệ'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Số lượng phải >= 1'),
  body('customerInfo.fullName').trim().notEmpty().withMessage('Vui lòng nhập họ tên'),
  body('customerInfo.phone').isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
  body('customerInfo.address').trim().notEmpty().withMessage('Vui lòng nhập địa chỉ'),
  body('voucherCodes')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Chỉ áp dụng tối đa 5 mã giảm giá'),
  body('voucherCodes.*').isString().trim().isLength({ min: 1, max: 40 }).withMessage('Mã giảm giá không hợp lệ'),
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'bank_transfer', 'momo', 'vnpay'])
    .withMessage('Phương thức thanh toán không hợp lệ'),
];
