import { z } from 'zod';
import { ENV } from '../config/env';

export const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(ENV.AI_MAX_INPUT_CHARS, `Message exceeds maximum allowed length of ${ENV.AI_MAX_INPUT_CHARS} characters.`),
  conversationId: z.string().trim().max(100).optional(),
  mode: z.enum(['dashboard', 'passport']).optional().default('dashboard'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(1000),
      })
    )
    .max(10)
    .optional(),
});
