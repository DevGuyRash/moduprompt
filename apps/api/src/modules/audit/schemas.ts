import { z } from 'zod';

export const auditLogEventTypeSchema = z.enum([
  'snippet.version.created',
  'snippet.version.reverted',
  'document.status.changed',
  'document.tags.changed',
  'export.completed',
  'plugin.installed',
]);

export const auditLogMetadataSchema: z.ZodSchema<Record<string, unknown>> = z
  .record(z.string(), z.unknown())
  .transform((value) => ({ ...value }));

export const auditLogEntrySchema = z.object({
  id: z.string().min(1),
  type: auditLogEventTypeSchema,
  subjectId: z.string().min(1),
  metadata: auditLogMetadataSchema,
  actorId: z.string().min(1).optional(),
  occurredAt: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const auditLogListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export const auditLogListResponseSchema = z.object({
  items: z.array(auditLogEntrySchema),
  nextCursor: z.string().nullable(),
});

export const auditLogIngestRequestSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        type: auditLogEventTypeSchema,
        subjectId: z.string().min(1),
        metadata: auditLogMetadataSchema,
        actorId: z.string().min(1).optional(),
        occurredAt: z.string().min(1),
        createdAt: z.number().int().nonnegative(),
        updatedAt: z.number().int().nonnegative(),
      }),
    )
    .max(200),
});

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type AuditLogIngestRequest = z.infer<typeof auditLogIngestRequestSchema>;
