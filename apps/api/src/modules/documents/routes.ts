import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { DocumentService } from './service.js';
import {
  createDocumentRequestSchema,
  documentListResponseSchema,
  documentParamsSchema,
  documentQuerySchema,
  documentResponseSchema,
  setStatusRequestSchema,
  setTagsRequestSchema,
  updateDocumentRequestSchema,
  type CreateDocumentRequest,
  type DocumentListQuery,
  type DocumentListResponse,
  type DocumentParams,
  type DocumentResponse,
  type SetStatusRequest,
  type SetTagsRequest,
  type UpdateDocumentRequest,
} from './contracts.js';

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
        200: documentListResponseSchema,
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
        201: documentResponseSchema,
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
        200: documentResponseSchema,
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
        200: documentResponseSchema,
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
        200: documentResponseSchema,
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
        200: documentResponseSchema,
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
