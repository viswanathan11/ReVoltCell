import { Router } from 'express';
import { MockController } from '../controllers/mockController';
import { validateBody } from '../middleware/validation';
import { simulateTestSchema } from '../validators/testValidator';

const router = Router();

router.post('/tests/:testId/simulate', validateBody(simulateTestSchema), MockController.simulateTest);

export default router;
