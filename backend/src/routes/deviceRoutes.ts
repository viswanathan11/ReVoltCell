import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { validateBody } from '../middleware/validation';
import { deviceTestDataSchema } from '../validators/testValidator';

const router = Router();

router.post('/test-data', validateBody(deviceTestDataSchema), DeviceController.receiveDeviceData);

export default router;
