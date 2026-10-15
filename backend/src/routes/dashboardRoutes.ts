import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';

const router = Router();

router.get('/summary', DashboardController.getSummary);
router.get('/recent-tests', DashboardController.getRecentTests);
router.get('/score-distribution', DashboardController.getScoreDistribution);
router.get('/stream', DashboardController.streamDashboard);

export default router;
