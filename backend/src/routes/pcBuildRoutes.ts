import { Router } from 'express';
import {
  createPcBuild,
  deletePcBuild,
  getMyPcBuilds,
  getPcBuildById,
  updatePcBuild,
} from '../controllers/pcBuildController';
import { optionalAuth, protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', optionalAuth, createPcBuild);
router.get('/my', protect, getMyPcBuilds);
router.route('/:id')
  .get(optionalAuth, getPcBuildById)
  .put(protect, updatePcBuild)
  .delete(protect, deletePcBuild);

export default router;
