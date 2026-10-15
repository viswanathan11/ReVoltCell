import { z } from 'zod';

export const createTestSchema = z.object({
  cellId: z.string().min(1, 'cellId is required').trim(),
  loadResistanceOhms: z.number().positive().optional().default(5.0),
  loadPowerRatingWatts: z.number().positive().optional().default(10.0),
});

export const singleMeasurementSchema = z.object({
  elapsedSeconds: z.number().nonnegative('elapsedSeconds must be >= 0'),
  voltage: z.number().nonnegative('voltage cannot be negative'),
  current: z.number().nonnegative('current cannot be negative'),
  temperature: z.number().min(-30, 'temperature too low').max(150, 'temperature too high'),
  loadEnabled: z.boolean().optional().default(true),
  timestamp: z.string().optional(),
});

export const batchMeasurementSchema = z.object({
  measurements: z.array(singleMeasurementSchema).min(1, 'measurements array cannot be empty'),
});

export const completeTestSchema = z.object({
  finalVoltage: z.number().nonnegative('finalVoltage cannot be negative').optional(),
  minimumVoltage: z.number().nonnegative('minimumVoltage cannot be negative').optional(),
  averageCurrent: z.number().nonnegative('averageCurrent cannot be negative').optional(),
  maximumCurrent: z.number().nonnegative('maximumCurrent cannot be negative').optional(),
  initialTemperature: z.number().optional(),
  maximumTemperature: z.number().optional(),
  testDurationSeconds: z.number().nonnegative('testDurationSeconds must be >= 0').optional(),
  stopReason: z.enum(['COMPLETED', 'USER_STOP', 'LOW_VOLTAGE', 'OVER_TEMPERATURE', 'TIMEOUT', 'ERROR']).optional().default('COMPLETED'),
});

export const stopTestSchema = z.object({
  stopReason: z.enum(['COMPLETED', 'USER_STOP', 'LOW_VOLTAGE', 'OVER_TEMPERATURE', 'TIMEOUT', 'ERROR']).optional().default('USER_STOP'),
});

export const simulateTestSchema = z.object({
  profile: z.enum(['GOOD', 'WEAK', 'HOT', 'UNSTABLE']).optional().default('GOOD'),
});

export const createLifecycleEventSchema = z.object({
  event: z.enum([
    'ORIGINAL_EV',
    'EV_BATTERY',
    'RETIRED',
    'RECOVERED',
    'REVOLTCELL_TESTED',
    'TESTED',
    'SCORED',
    'SECOND_LIFE_EVALUATION',
    'SECOND_LIFE_APPLICATION',
    'SECOND_LIFE_CANDIDATE',
    'RETEST',
    'RECYCLE',
  ]),
  description: z.string().min(1, 'description is required'),
});

export const deviceTestDataSchema = z.object({
  deviceId: z.string().optional().default('REVOLTCELL-ESP32-001'),
  cellId: z.string().min(1),
  testId: z.string().min(1),
  elapsedSeconds: z.number().nonnegative(),
  voltage: z.number().nonnegative(),
  current: z.number().nonnegative(),
  temperature: z.number(),
  loadEnabled: z.boolean().optional().default(true),
});

export const deviceTestCompleteSchema = z.object({
  deviceId: z.string().optional().default('REVOLTCELL-ESP32-001'),
  testId: z.string().min(1, 'testId is required'),
  cellId: z.string().min(1, 'cellId is required'),
  stopReason: z.enum(['COMPLETED', 'USER_STOP', 'LOW_VOLTAGE', 'OVER_TEMPERATURE', 'TIMEOUT', 'ERROR']).optional().default('COMPLETED'),
  testDurationSeconds: z.number().nonnegative().optional(),
});

export const deviceScreeningSchema = z.object({
  voltage: z
    .number({ required_error: 'voltage is required' })
    .positive('voltage must be positive')
    .max(10, 'voltage exceeds single-cell limit (10V)'),
  temperature: z
    .number({ required_error: 'temperature is required' })
    .refine((val) => val !== -127 && val !== -127.0, {
      message: 'Temperature sensor disconnected or invalid reading (-127°C)',
    })
    .refine((val) => val >= -30 && val <= 120, {
      message: 'temperature out of valid operating range (-30°C to 120°C)',
    }),
  current_mA: z
    .number({ required_error: 'current_mA is required' })
    .nonnegative('current_mA cannot be negative')
    .max(50000, 'current_mA exceeds maximum plausible test threshold (50A)'),
  suitable: z.boolean().optional(),
  testDurationSeconds: z
    .number()
    .int('testDurationSeconds must be an integer')
    .positive('testDurationSeconds must be >= 1')
    .optional()
    .default(4),
  deviceId: z
    .string()
    .min(1)
    .optional()
    .default('REVOLTCELL-ESP32-001'),
});

