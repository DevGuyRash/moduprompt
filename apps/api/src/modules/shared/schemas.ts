import { z } from 'zod';

export const snippetFrontmatterSchema = z.object({
  schemaVersion: z.literal(1),
  tags: z.array(z.string().min(1)).optional(),
  status: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  language: z.string().max(64).optional(),
});

export const snippetSchema = z.object({
  title: z.string().min(1),
  path: z.string().min(1),
  frontmatter: snippetFrontmatterSchema,
  body: z.string().min(1),
});

export const snippetVersionSchema = z.object({
  note: z.string().max(200).optional(),
  author: z
    .object({
      id: z.string().min(1),
      name: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  body: z.string().min(1),
  frontmatter: snippetFrontmatterSchema.partial().optional(),
});

export const documentSettingsSchema = z.object({
  maxWidth: z.enum(['80ch', '96ch', '120ch']).default('96ch'),
  theme: z.string().optional(),
  pageNumbering: z.enum(['none', 'decimal', 'roman']).optional(),
});

export const documentSchema = z.object({
  title: z.string().min(1),
  schemaVersion: z.literal(2),
  blocks: z.array(z.any()),
  edges: z.array(z.any()),
  variables: z.array(z.any()),
  exportRecipes: z.array(
    z.object({
      recipeId: z.string().min(1),
      includeProvenance: z.boolean().optional(),
      lastRunAt: z.number().optional(),
    }),
  ),
  tags: z.array(z.string().min(1)).default([]),
  statusKey: z.string().min(1),
  settings: documentSettingsSchema,
});

export const exportJobCreateSchema = z.object({
  documentId: z.string().min(1),
  recipeId: z.string().min(1),
  actorId: z.string().optional(),
});

export const exportJobStatusSchema = z.enum(['queued', 'processing', 'completed', 'failed']);

export const webhookSubscriptionSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(10).optional(),
  events: z.array(z.string()).default([]),
});

export const pluginSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  kind: z.enum(['formatter', 'filter', 'exporter', 'adapter']),
  manifest: z.record(z.string(), z.any()),
});
