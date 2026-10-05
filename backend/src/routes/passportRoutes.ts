import { Router } from 'express';
import { PassportController } from '../controllers/passportController';

const router = Router();

router.get('/:cellId', PassportController.getPassport);

export default router;
