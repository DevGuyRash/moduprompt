import { z } from 'zod';
import { documentSchema } from '../shared/schemas.js';

export const createDocumentSchema = documentSchema;

export const updateDocumentSchema = documentSchema.partial({
  title: true,
  blocks: true,
  edges: true,
  variables: true,
  exportRecipes: true,
  tags: true,
  settings: true,
});

export const setTagsSchema = z.object({
  tags: z.array(z.string().min(1)).max(50),
  actorId: z.string().optional(),
});

export const setStatusSchema = z.object({
  statusKey: z.string().min(1),
  actorId: z.string().optional(),
});

export const documentQuerySchema = z.object({
  status: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});
