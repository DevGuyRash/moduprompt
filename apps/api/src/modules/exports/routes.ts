import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { ExportService } from './service.js';
import { createExportJobSchema, exportJobQuerySchema, updateExportJobStatusSchema } from './schemas.js';
import { z } from 'zod';

const exportJobSchema = z.object({
  id: z.string(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  documentId: z.string(),
  recipeId: z.string(),
  artifactUri: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  requestedBy: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable().optional(),
});

const exportJobListSchema = z.object({ items: z.array(exportJobSchema) });
const exportJobParamsSchema = z.object({ id: z.string() });

type ExportJobResponse = z.infer<typeof exportJobSchema>;
type ExportJobListResponse = z.infer<typeof exportJobListSchema>;
type ExportJobQuery = z.infer<typeof exportJobQuerySchema>;
type CreateExportJobRequest = z.infer<typeof createExportJobSchema>;
type UpdateExportJobRequest = z.infer<typeof updateExportJobStatusSchema>;
type ExportJobParams = z.infer<typeof exportJobParamsSchema>;

export const exportsRoutes: FastifyPluginAsync = async (app) => {
  const service = new ExportService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.get<{ Querystring: ExportJobQuery; Reply: ExportJobListResponse }>(
    '/exports',
    {
      schema: {
        tags: ['exports'],
        querystring: exportJobQuerySchema,
        response: {
          200: exportJobListSchema,
        },
      },
    },
    async (request) => {
      const items = await service.list(request.query);
      return { items };
    },
  );

  withTypeProvider.post<{ Body: CreateExportJobRequest; Reply: ExportJobResponse | { message: string } }>(
    '/exports',
    {
      schema: {
        tags: ['exports'],
        body: createExportJobSchema,
        response: {
          201: exportJobSchema,
          400: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { actorId, ...rest } = request.body;
        const job = await service.create({ ...rest, requestedBy: actorId });
        reply.code(201);
        return job;
      } catch (error) {
        reply.code(400);
        return { message: (error as Error).message };
      }
    },
  );

  withTypeProvider.get<{ Params: ExportJobParams; Reply: ExportJobResponse | { message: string } }>(
    '/exports/:id',
    {
      schema: {
        tags: ['exports'],
        params: exportJobParamsSchema,
        response: {
          200: exportJobSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const job = await service.get(request.params.id);
      if (!job) {
        reply.code(404);
        return { message: 'Export job not found' };
      }
      return job;
    },
  );

  withTypeProvider.patch<{ Params: ExportJobParams; Body: UpdateExportJobRequest; Reply: ExportJobResponse | { message: string } }>(
    '/exports/:id',
    {
      schema: {
        tags: ['exports'],
        params: exportJobParamsSchema,
        body: updateExportJobStatusSchema,
        response: {
          200: exportJobSchema,
          400: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const job = await service.update(request.params.id, request.body);
        return job;
      } catch (error) {
        reply.code(400);
        return { message: (error as Error).message };
      }
    },
  );
};
