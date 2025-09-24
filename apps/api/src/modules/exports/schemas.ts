import { z } from 'zod';
import { exportJobCreateSchema, exportJobStatusSchema } from '../shared/schemas.js';

export const createExportJobSchema = exportJobCreateSchema;

export const updateExportJobStatusSchema = z.object({
  status: exportJobStatusSchema,
  artifactUri: z.string().url().optional(),
  error: z.string().optional(),
  actorId: z.string().optional(),
});

export const exportJobQuerySchema = z.object({
  documentId: z.string().optional(),
  recipeId: z.string().optional(),
});
