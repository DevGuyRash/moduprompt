import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { DocumentService } from './service.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentQuerySchema,
  setTagsSchema,
  setStatusSchema,
} from './schemas.js';
import { z } from 'zod';

const documentSchema = z.object({
  id: z.string(),
  title: z.string(),
  schemaVersion: z.literal(2),
  blocks: z.array(z.any()),
  edges: z.array(z.any()),
  variables: z.array(z.any()),
  exportRecipes: z.array(z.any()),
  tags: z.array(z.string()),
  statusKey: z.string(),
  settings: z.object({
    maxWidth: z.enum(['80ch', '96ch', '120ch']),
    theme: z.string().optional(),
    pageNumbering: z.enum(['none', 'decimal', 'roman']).optional(),
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const documentListSchema = z.object({ items: z.array(documentSchema) });
const documentParamsSchema = z.object({ id: z.string() });
const createDocumentRequestSchema = createDocumentSchema.extend({
  id: z.string().optional(),
  actorId: z.string().optional(),
});

type DocumentResponse = z.infer<typeof documentSchema>;
type DocumentListResponse = z.infer<typeof documentListSchema>;
type DocumentParams = z.infer<typeof documentParamsSchema>;
type DocumentListQuery = z.infer<typeof documentQuerySchema>;
type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>;
type UpdateDocumentRequest = z.infer<typeof updateDocumentSchema>;
type SetTagsRequest = z.infer<typeof setTagsSchema>;
type SetStatusRequest = z.infer<typeof setStatusSchema>;

export const documentsRoutes: FastifyPluginAsync = async (app) => {
  const service = new DocumentService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.route<{ Querystring: DocumentListQuery; Reply: DocumentListResponse }>({
    method: 'GET',
    url: '/documents',
    schema: {
      tags: ['documents'],
      querystring: documentQuerySchema,
      response: {
        200: documentListSchema,
      },
    },
    handler: async (request) => {
      const items = await service.list(request.query);
      return { items };
    },
  });

  withTypeProvider.route<{ Body: CreateDocumentRequest; Reply: DocumentResponse }>({
    method: 'POST',
    url: '/documents',
    schema: {
      tags: ['documents'],
      body: createDocumentRequestSchema,
      response: {
        201: documentSchema,
      },
    },
    handler: async (request, reply) => {
      const { actorId, ...payload } = request.body;
      const document = await service.create(payload, actorId);
      reply.code(201);
      return document;
    },
  });

  withTypeProvider.route<{ Params: DocumentParams; Reply: DocumentResponse | { message: string } }>({
    method: 'GET',
    url: '/documents/:id',
    schema: {
      tags: ['documents'],
      params: documentParamsSchema,
      response: {
        200: documentSchema,
        404: z.object({ message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const document = await service.get(request.params.id);
      if (!document) {
        reply.code(404);
        return { message: 'Document not found' };
      }
      return document;
    },
  });

  withTypeProvider.route<{
    Params: DocumentParams;
    Body: UpdateDocumentRequest;
    Reply: DocumentResponse | { message: string };
  }>({
    method: 'PATCH',
    url: '/documents/:id',
    schema: {
      tags: ['documents'],
      params: documentParamsSchema,
      body: updateDocumentSchema,
      response: {
        200: documentSchema,
        404: z.object({ message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        return await service.update(request.params.id, request.body);
      } catch (error) {
        reply.code(404);
        return { message: (error as Error).message };
      }
    },
  });

  withTypeProvider.route<{
    Params: DocumentParams;
    Body: SetTagsRequest;
    Reply: DocumentResponse | { message: string };
  }>({
    method: 'PATCH',
    url: '/documents/:id/tags',
    schema: {
      tags: ['documents'],
      params: documentParamsSchema,
      body: setTagsSchema,
      response: {
        200: documentSchema,
        400: z.object({ message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        return await service.setTags(request.params.id, request.body);
      } catch (error) {
        reply.code(400);
        return { message: (error as Error).message };
      }
    },
  });

  withTypeProvider.route<{
    Params: DocumentParams;
    Body: SetStatusRequest;
    Reply: DocumentResponse | { message: string };
  }>({
    method: 'PATCH',
    url: '/documents/:id/status',
    schema: {
      tags: ['documents'],
      params: documentParamsSchema,
      body: setStatusSchema,
      response: {
        200: documentSchema,
        400: z.object({ message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      try {
        return await service.setStatus(request.params.id, request.body);
      } catch (error) {
        reply.code(400);
        return { message: (error as Error).message };
      }
    },
  });
};
