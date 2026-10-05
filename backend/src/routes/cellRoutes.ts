import { Router } from 'express';
import { CellController } from '../controllers/cellController';
import { TestController } from '../controllers/testController';
import { AnalysisController } from '../controllers/analysisController';
import { ApplicationController } from '../controllers/applicationController';
import { LifecycleController } from '../controllers/lifecycleController';
import { PassportController } from '../controllers/passportController';
import { QrController } from '../controllers/qrController';
import { MatchingService } from '../services/matchingService';
import { validateBody, validateQuery } from '../middleware/validation';
import { createCellSchema, updateCellSchema, queryCellsSchema } from '../validators/cellValidator';
import { createLifecycleEventSchema } from '../validators/testValidator';

const router = Router();

// Cell CRUD
router.post('/', validateBody(createCellSchema), CellController.createCell);
router.get('/', validateQuery(queryCellsSchema), CellController.getCells);
router.get('/:cellId', CellController.getCellById);
router.patch('/:cellId', validateBody(updateCellSchema), CellController.updateCell);
router.delete('/:cellId', CellController.deleteCell);

// Nested routes for cell
router.get('/:cellId/tests', TestController.getTestsForCell);
router.get('/:cellId/analysis', AnalysisController.getCellAnalysis);
router.get('/:cellId/applications', ApplicationController.getCellApplications);
router.get('/:cellId/lifecycle', LifecycleController.getCellLifecycle);
router.post('/:cellId/lifecycle', validateBody(createLifecycleEventSchema), LifecycleController.addLifecycleEvent);
router.get('/:cellId/passport', PassportController.getPassport);
router.get('/:cellId/qr', QrController.getCellQr);

// Cell matching
router.get('/:cellId/matches', async (req, res, next) => {
  try {
    const cellId = req.params.cellId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
    const result = await MatchingService.findMatches(cellId, limit);
    if (!result) {
      res.status(404).json({
        success: false,
        error: { code: 'CELL_NOT_FOUND', message: `Cell ${cellId} was not found.` },
      });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
