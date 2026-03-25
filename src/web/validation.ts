import { z } from 'zod';

export const durationSchema = z.string().regex(/^\d+[mhd]$/, 'Invalid duration format. Use e.g. "1h", "30m", "1d"');
export const logLevelSchema = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);
export const safeStringSchema = z.string().max(500);
export const limitSchema = z.coerce.number().int().min(1).max(10000).default(200);
export const intervalSchema = z.coerce.number().int().min(1).max(1440).default(5);

export const errorsQuerySchema = z.object({
  last: durationSchema.default('1h'),
  service: safeStringSchema.optional(),
  level: logLevelSchema.default('ERROR'),
});

export const logsQuerySchema = z.object({
  last: durationSchema.default('1h'),
  service: safeStringSchema.optional(),
  level: logLevelSchema.optional(),
  path: safeStringSchema.optional(),
  grep: safeStringSchema.optional(),
  limit: limitSchema,
});

export const askBodySchema = z.object({
  question: z.string().min(1).max(2000),
});

export const exportBodySchema = z.object({
  type: z.enum(['errors', 'logs', 'journey']).default('errors'),
  format: z.enum(['json', 'csv', 'md']).default('json'),
  filters: z.record(z.string(), z.string()).optional(),
});

export const userIdSchema = z.string().min(1).max(200);
export const timeseriesQuerySchema = z.object({
  service: safeStringSchema.optional(),
  interval: intervalSchema,
});
export const latencyQuerySchema = z.object({
  last: durationSchema.default('5m'),
  service: safeStringSchema.optional(),
});
