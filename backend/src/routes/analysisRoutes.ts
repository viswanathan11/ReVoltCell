import { Router } from 'express';
import { AnalysisController } from '../controllers/analysisController';

const router = Router();

router.post('/:testId/generate', AnalysisController.generateAnalysis);
router.get('/:testId', AnalysisController.getTestAnalysis);

export default router;
