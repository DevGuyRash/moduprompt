import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { SnippetService } from './service.js';
import {
  createSnippetRequestSchema,
  createSnippetVersionRequestSchema,
  revertSnippetVersionRequestSchema,
  snippetListResponseSchema,
  snippetParamsSchema,
  snippetQuerySchema,
  snippetResponseSchema,
  snippetVersionParamsSchema,
  snippetVersionResponseSchema,
  updateSnippetRequestSchema,
  type CreateSnippetRequest,
  type CreateSnippetVersionRequest,
  type RevertSnippetVersionRequest,
  type SnippetListResponse,
  type SnippetParams,
  type SnippetQuery,
  type SnippetResponse,
  type SnippetVersionParams,
  type SnippetVersionResponse,
  type UpdateSnippetRequest,
} from './contracts.js';

export const snippetsRoutes: FastifyPluginAsync = async (app) => {
  const service = new SnippetService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.route<{ Querystring: SnippetQuery; Reply: SnippetListResponse }>({
    method: 'GET',
    url: '/snippets',
    schema: {
      tags: ['snippets'],
      querystring: snippetQuerySchema,
      response: {
        200: snippetListResponseSchema,
      },
    },
    handler: async (request) => {
      const items = await service.list(request.query);
      return { items };
    },
  });

  withTypeProvider.route<{ Body: CreateSnippetRequest; Reply: SnippetResponse }>({
    method: 'POST',
    url: '/snippets',
    schema: {
      tags: ['snippets'],
      body: createSnippetRequestSchema,
      response: {
        201: snippetResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { actorId, ...payload } = request.body;
      const result = await service.create(payload, actorId);
      reply.code(201);
      return {
        snippet: result.snippet,
        versions: [result.version],
      } satisfies SnippetResponse;
    },
  });

  withTypeProvider.route<{ Params: SnippetParams; Reply: SnippetResponse | { message: string } }>({
    method: 'GET',
    url: '/snippets/:id',
    schema: {
      tags: ['snippets'],
      params: snippetParamsSchema,
      response: {
        200: snippetResponseSchema,
        404: z.object({ message: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const result = await service.get(request.params.id);
      if (!result) {
        reply.code(404);
        return { message: 'Snippet not found' };
      }
      return result;
    },
  });

  withTypeProvider.route<{ Params: SnippetParams; Body: UpdateSnippetRequest; Reply: SnippetResponse['snippet'] }>({
    method: 'PATCH',
    url: '/snippets/:id',
    schema: {
      tags: ['snippets'],
      params: snippetParamsSchema,
      body: updateSnippetRequestSchema,
      response: {
        200: snippetResponseSchema.shape.snippet,
      },
    },
    handler: async (request) => {
      const snippet = await service.update(request.params.id, request.body);
      return snippet;
    },
  });

  withTypeProvider.route<{
    Params: SnippetParams;
    Body: CreateSnippetVersionRequest;
    Reply: SnippetVersionResponse;
  }>({
    method: 'POST',
    url: '/snippets/:id/versions',
    schema: {
      tags: ['snippets'],
      params: snippetParamsSchema,
      body: createSnippetVersionRequestSchema,
      response: {
        201: snippetVersionResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const version = await service.createVersion(request.params.id, request.body);
      reply.code(201);
      return version;
    },
  });

  withTypeProvider.route<{
    Params: SnippetVersionParams;
    Body: RevertSnippetVersionRequest;
    Reply: SnippetResponse;
  }>({
    method: 'POST',
    url: '/snippets/:id/versions/:rev/revert',
    schema: {
      tags: ['snippets'],
      params: snippetVersionParamsSchema,
      body: revertSnippetVersionRequestSchema,
      response: {
        200: snippetResponseSchema,
      },
    },
    handler: async (request) => {
      const result = await service.revert(request.params.id, {
        targetRev: request.params.rev,
        actorId: request.body.actorId,
      });
      return {
        snippet: result.snippet,
        versions: [result.version],
      } satisfies SnippetResponse;
    },
  });
};
