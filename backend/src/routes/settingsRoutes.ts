import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { admin, protect } from '../middlewares/authMiddleware';

const router = Router();

// Store settings are public to read, but only an authenticated admin may change them.
router.get('/', getSettings);
router.put('/', protect, admin, updateSettings);

export default router;
