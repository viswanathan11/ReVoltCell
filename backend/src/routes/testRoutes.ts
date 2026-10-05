import { Router } from 'express';
import { TestController } from '../controllers/testController';
import { AnalysisController } from '../controllers/analysisController';
import { validateBody } from '../middleware/validation';
import {
  createTestSchema,
  singleMeasurementSchema,
  batchMeasurementSchema,
  completeTestSchema,
  stopTestSchema,
} from '../validators/testValidator';

const router = Router();

router.post('/', validateBody(createTestSchema), TestController.createTest);
router.post('/:testId/start', TestController.startTest);
router.post('/:testId/measurements', validateBody(singleMeasurementSchema), TestController.addMeasurement);
router.post('/:testId/measurements/batch', validateBody(batchMeasurementSchema), TestController.addBatchMeasurements);
router.post('/:testId/complete', validateBody(completeTestSchema), TestController.completeTest);
router.post('/:testId/stop', validateBody(stopTestSchema), TestController.stopTest);
router.get('/:testId', TestController.getTestById);
router.get('/:testId/analysis', AnalysisController.getTestAnalysis);

export default router;
