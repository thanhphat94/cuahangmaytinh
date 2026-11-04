import { Router } from 'express';
import { createContact, deleteContact, getContacts, getMyContacts, markAsRead, replyContact } from '../controllers/contactController';
import { admin, optionalAuth, protect } from '../middlewares/authMiddleware';

const router = Router();

// optionalAuth: khách vẫn gửi được; nếu đã đăng nhập thì lấy thông tin từ tài khoản.
router.post('/', optionalAuth, createContact);
router.get('/my', protect, getMyContacts); // người dùng xem liên hệ + phản hồi của mình
router.get('/', protect, admin, getContacts);
router.put('/:id/read', protect, admin, markAsRead);
router.put('/:id/reply', protect, admin, replyContact);
router.delete('/:id', protect, admin, deleteContact);

export default router;
