import { z } from 'zod';
import { snippetSchema, snippetVersionSchema } from '../shared/schemas.js';

export const createSnippetBodySchema = snippetSchema;

export const updateSnippetBodySchema = snippetSchema.partial().extend({
  title: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export const createSnippetVersionBodySchema = snippetVersionSchema.extend({
  copyFromRev: z.number().int().positive().optional(),
});

export const revertSnippetVersionBodySchema = z.object({
  targetRev: z.number().int().positive(),
  actorId: z.string().optional(),
});

export const snippetQuerySchema = z.object({
  path: z.string().optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
});
