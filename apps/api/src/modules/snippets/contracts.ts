import { z } from 'zod';
import {
  createSnippetBodySchema,
  createSnippetVersionBodySchema,
  revertSnippetVersionBodySchema,
  snippetQuerySchema,
  updateSnippetBodySchema,
} from './schemas.js';

export const snippetVersionResponseSchema = z.object({
  snippetId: z.string(),
  rev: z.number(),
  parentRev: z.number().nullable().optional(),
  author: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  note: z.string().optional(),
  timestamp: z.number(),
  body: z.string(),
  frontmatter: z.record(z.string(), z.any()),
  hash: z.string(),
});

export const snippetResponseSchema = z.object({
  snippet: z.object({
    id: z.string(),
    title: z.string(),
    path: z.string(),
    frontmatter: z.record(z.string(), z.any()),
    body: z.string(),
    headRev: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  versions: z.array(snippetVersionResponseSchema),
});

export const snippetListResponseSchema = z.object({
  items: z.array(snippetResponseSchema.shape.snippet),
});

export const snippetParamsSchema = z.object({ id: z.string() });

export const snippetVersionParamsSchema = z.object({
  id: z.string(),
  rev: z.coerce.number().int().positive(),
});

export const createSnippetRequestSchema = createSnippetBodySchema.extend({
  actorId: z.string().optional(),
});

export const updateSnippetRequestSchema = updateSnippetBodySchema;

export const createSnippetVersionRequestSchema = createSnippetVersionBodySchema;

export const revertSnippetVersionRequestSchema = revertSnippetVersionBodySchema;

export { snippetQuerySchema };

export type SnippetResponse = z.infer<typeof snippetResponseSchema>;
export type SnippetListResponse = z.infer<typeof snippetListResponseSchema>;
export type SnippetVersionResponse = z.infer<typeof snippetVersionResponseSchema>;
export type SnippetParams = z.infer<typeof snippetParamsSchema>;
export type SnippetVersionParams = z.infer<typeof snippetVersionParamsSchema>;
export type CreateSnippetRequest = z.infer<typeof createSnippetRequestSchema>;
export type UpdateSnippetRequest = z.infer<typeof updateSnippetRequestSchema>;
export type CreateSnippetVersionRequest = z.infer<typeof createSnippetVersionRequestSchema>;
export type RevertSnippetVersionRequest = z.infer<typeof revertSnippetVersionRequestSchema>;
