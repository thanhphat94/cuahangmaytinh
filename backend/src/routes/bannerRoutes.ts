import { Router } from 'express';
import { getBanners } from '../controllers/bannerController';

const router = Router();

router.get('/', getBanners);

export default router;
