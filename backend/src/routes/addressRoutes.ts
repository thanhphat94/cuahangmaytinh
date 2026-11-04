import { Router } from 'express';
import { addAddress, deleteAddress, getAddresses, updateAddress } from '../controllers/addressController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/').get(getAddresses).post(addAddress);
router.route('/:id').put(updateAddress).delete(deleteAddress);

export default router;
