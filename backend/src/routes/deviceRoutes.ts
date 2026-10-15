import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { validateBody } from '../middleware/validation';
import {
  deviceTestDataSchema,
  deviceTestCompleteSchema,
  deviceScreeningSchema,
} from '../validators/testValidator';

const router = Router();

router.post('/screening', validateBody(deviceScreeningSchema), DeviceController.processScreening);
router.post('/test-data', validateBody(deviceTestDataSchema), DeviceController.receiveDeviceData);
router.post('/test-complete', validateBody(deviceTestCompleteSchema), DeviceController.completeDeviceTest);

export default router;
