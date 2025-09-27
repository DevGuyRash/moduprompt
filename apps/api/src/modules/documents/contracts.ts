import { z } from 'zod';
import {
  createDocumentSchema,
  documentQuerySchema,
  documentSchema,
  setStatusSchema,
  setTagsSchema,
  updateDocumentSchema,
} from './schemas.js';

export const documentResponseSchema = documentSchema.extend({
  id: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const documentListResponseSchema = z.object({
  items: z.array(documentResponseSchema),
});

export const documentParamsSchema = z.object({ id: z.string() });

export const createDocumentRequestSchema = createDocumentSchema.extend({
  id: z.string().optional(),
  actorId: z.string().optional(),
});

export const updateDocumentRequestSchema = updateDocumentSchema;

export const setTagsRequestSchema = setTagsSchema;

export const setStatusRequestSchema = setStatusSchema;

export { documentQuerySchema };

export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;
export type DocumentParams = z.infer<typeof documentParamsSchema>;
export type DocumentListQuery = z.infer<typeof documentQuerySchema>;
export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>;
export type UpdateDocumentRequest = z.infer<typeof updateDocumentRequestSchema>;
export type SetTagsRequest = z.infer<typeof setTagsRequestSchema>;
export type SetStatusRequest = z.infer<typeof setStatusRequestSchema>;
