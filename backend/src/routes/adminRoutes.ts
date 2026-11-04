import { Router } from 'express';
import {
  createBanner,
  createCategory,
  createPost,
  createProduct,
  deleteBanner,
  deleteCategory,
  deletePost,
  deleteProduct,
  getAllOrders,
  getAllCategories,
  deleteUser,
  getAllPosts,
  seedSamplePosts,
  getAllProducts,
  getAllUsers,
  getDashboardStats,
  getNotifications,
  shippingWebhook,
  toggleUserStatus,
  updateBanner,
  updateCategory,
  updateOrderStatus,
  updatePost,
  updateProduct,
} from '../controllers/adminController';
import { admin, protect } from '../middlewares/authMiddleware';
import catchAsync from '../helpers/catchAsync';

// ✅ FIX: Review logic tách ra service, không viết inline trong router
import { getReviews } from '../services/reviewAdminService';

const router = Router();

router.use(protect, admin);

router.get('/stats',         getDashboardStats);
router.get('/notifications', getNotifications);

router.route('/products').get(getAllProducts).post(createProduct);
router.route('/products/:id').put(updateProduct).delete(deleteProduct);

router.route('/categories').get(getAllCategories).post(createCategory);
router.route('/categories/:id').put(updateCategory).delete(deleteCategory);

router.route('/orders').get(getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/simulate-webhook', shippingWebhook);

router.route('/banners').post(createBanner);
router.route('/banners/:id').put(updateBanner).delete(deleteBanner);

router.post('/posts/seed-samples', seedSamplePosts);
router.route('/posts').get(getAllPosts).post(createPost);
router.route('/posts/:id').put(updatePost).delete(deletePost);

router.route('/users').get(getAllUsers);
router.put('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/reviews', catchAsync(async (req, res) => {
  const reviews = await getReviews({
    approved: typeof req.query.approved === 'string' ? req.query.approved : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
  });
  res.json(reviews);
}));

export default router;
