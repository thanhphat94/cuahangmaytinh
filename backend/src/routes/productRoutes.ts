import { Router } from 'express';
import {
  getDiscountedProducts,
  getFeaturedProducts,
  getNewProducts,
  getProductBySlug,
  getProducts,
} from '../controllers/productController';

const router = Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new', getNewProducts);
router.get('/discounted', getDiscountedProducts);
router.get('/:slug', getProductBySlug);

export default router;
