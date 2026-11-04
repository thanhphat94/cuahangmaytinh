import { Router } from 'express';
import { getPostBySlug, getPosts } from '../controllers/postController';

const router = Router();

router.get('/', getPosts);
router.get('/:slug', getPostBySlug);

export default router;
