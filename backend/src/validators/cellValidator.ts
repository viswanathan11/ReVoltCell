import { z } from 'zod';

export const createCellSchema = z.object({
  cellId: z.string().min(1, 'cellId is required').trim(),
  cellType: z.string().optional().default('18650'),
  manufacturer: z.string().optional().default('Unknown'),
  model: z.string().optional().default('18650'),
  chemistry: z.string().optional().default('Li-ion'),
  nominalVoltage: z.number().positive('nominalVoltage must be greater than 0'),
  ratedCapacityMah: z.number().nonnegative('ratedCapacityMah must be greater than or equal to 0'),
  source: z.string().optional().default('Recovered EV battery'),
  manufactureDate: z.string().optional(),
});

export const updateCellSchema = z.object({
  cellType: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  chemistry: z.string().optional(),
  nominalVoltage: z.number().positive().optional(),
  ratedCapacityMah: z.number().nonnegative().optional(),
  source: z.string().optional(),
  manufactureDate: z.string().optional(),
  status: z.enum(['REGISTERED', 'TESTING', 'TESTED', 'FAILED', 'ARCHIVED']).optional(),
});

export const queryCellsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
  limit: z.string().optional().transform((val) => (val ? Math.max(1, Math.min(100, parseInt(val, 10))) : 20)),
  status: z.enum(['REGISTERED', 'TESTING', 'TESTED', 'FAILED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
});
