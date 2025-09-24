import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { DocumentService } from './service.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentQuerySchema,
  setTagsSchema,
  setStatusSchema,
} from './schemas.js';

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

export const documentsRoutes: FastifyPluginAsync = async (app) => {
  const service = new DocumentService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.get('/documents', {
    schema: {
      tags: ['documents'],
      querystring: documentQuerySchema,
      response: {
        200: documentListSchema,
      },
    },
  }, async (request) => {
    const items = await service.list(request.query);
    return { items };
  });

  withTypeProvider.post('/documents', {
    schema: {
      tags: ['documents'],
      body: createDocumentSchema.extend({ id: z.string().optional(), actorId: z.string().optional() }),
      response: {
        201: documentSchema,
      },
    },
  }, async (request, reply) => {
    const { actorId, ...payload } = request.body;
    const document = await service.create(payload, actorId);
    reply.code(201);
    return document;
  });

  withTypeProvider.get('/documents/:id', {
    schema: {
      tags: ['documents'],
      params: z.object({ id: z.string() }),
      response: {
        200: documentSchema,
        404: z.object({ message: z.string() }),
      },
    },
  }, async (request, reply) => {
    const document = await service.get(request.params.id);
    if (!document) {
      reply.code(404);
      return { message: 'Document not found' };
    }
    return document;
  });

  withTypeProvider.patch('/documents/:id', {
    schema: {
      tags: ['documents'],
      params: z.object({ id: z.string() }),
      body: updateDocumentSchema,
      response: {
        200: documentSchema,
      },
    },
  }, async (request, reply) => {
    try {
      return await service.update(request.params.id, request.body);
    } catch (error) {
      reply.code(404);
      return { message: (error as Error).message };
    }
  });

  withTypeProvider.patch('/documents/:id/tags', {
    schema: {
      tags: ['documents'],
      params: z.object({ id: z.string() }),
      body: setTagsSchema,
      response: {
        200: documentSchema,
        400: z.object({ message: z.string() }),
      },
    },
  }, async (request, reply) => {
    try {
      return await service.setTags(request.params.id, request.body);
    } catch (error) {
      reply.code(400);
      return { message: (error as Error).message };
    }
  });

  withTypeProvider.patch('/documents/:id/status', {
    schema: {
      tags: ['documents'],
      params: z.object({ id: z.string() }),
      body: setStatusSchema,
      response: {
        200: documentSchema,
        400: z.object({ message: z.string() }),
      },
    },
  }, async (request, reply) => {
    try {
      return await service.setStatus(request.params.id, request.body);
    } catch (error) {
      reply.code(400);
      return { message: (error as Error).message };
    }
  });
};
