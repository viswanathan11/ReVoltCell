import { Router } from 'express';
import { AiController } from '../controllers/aiController';
import { validateBody } from '../middleware/validation';
import { chatRequestSchema } from '../validators/aiValidator';

const router = Router();

// Primary chat endpoint: POST /api/ai/tests/:testId/chat
router.post('/tests/:testId/chat', validateBody(chatRequestSchema), AiController.chatAboutTest);

// QR Passport chat endpoint: POST /api/ai/passport/:cellId/chat
router.post('/passport/:cellId/chat', validateBody(chatRequestSchema), AiController.chatAboutPassport);

export default router;
