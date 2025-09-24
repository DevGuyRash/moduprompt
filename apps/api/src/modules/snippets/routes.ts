import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { SnippetService } from './service.js';
import {
  createSnippetBodySchema,
  updateSnippetBodySchema,
  createSnippetVersionBodySchema,
  revertSnippetVersionBodySchema,
  snippetQuerySchema,
} from './schemas.js';

const snippetResponseSchema = z.object({
  snippet: z.object({
    id: z.string(),
    title: z.string(),
    path: z.string(),
    frontmatter: z.record(z.any()),
    body: z.string(),
    headRev: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  versions: z.array(
    z.object({
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
      frontmatter: z.record(z.any()),
      hash: z.string(),
    }),
  ),
});

const snippetListSchema = z.object({
  items: z.array(snippetResponseSchema.shape.snippet),
});

const snippetVersionSchema = snippetResponseSchema.shape.versions.element;

export const snippetsRoutes: FastifyPluginAsync = async (app) => {
  const service = new SnippetService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.get('/snippets', {
    schema: {
      tags: ['snippets'],
      querystring: snippetQuerySchema,
      response: {
        200: snippetListSchema,
      },
    },
  }, async (request) => {
    const items = await service.list(request.query);
    return { items };
  });

  withTypeProvider.post('/snippets', {
    schema: {
      tags: ['snippets'],
      body: createSnippetBodySchema.extend({ actorId: z.string().optional() }),
      response: {
        201: snippetResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { actorId, ...payload } = request.body;
    const result = await service.create(payload, actorId);
    reply.code(201);
    return {
      snippet: result.snippet,
      versions: [result.version],
    };
  });

  withTypeProvider.get('/snippets/:id', {
    schema: {
      tags: ['snippets'],
      params: z.object({ id: z.string() }),
      response: {
        200: snippetResponseSchema,
        404: z.object({ message: z.string() }),
      },
    },
  }, async (request, reply) => {
    const result = await service.get(request.params.id);
    if (!result) {
      reply.code(404);
      return { message: 'Snippet not found' };
    }
    return result;
  });

  withTypeProvider.patch('/snippets/:id', {
    schema: {
      tags: ['snippets'],
      params: z.object({ id: z.string() }),
      body: updateSnippetBodySchema,
      response: {
        200: snippetResponseSchema.shape.snippet,
      },
    },
  }, async (request) => {
    const snippet = await service.update(request.params.id, request.body);
    return snippet;
  });

  withTypeProvider.post('/snippets/:id/versions', {
    schema: {
      tags: ['snippets'],
      params: z.object({ id: z.string() }),
      body: createSnippetVersionBodySchema,
      response: {
        201: snippetVersionSchema,
      },
    },
  }, async (request, reply) => {
    const version = await service.createVersion(request.params.id, request.body);
    reply.code(201);
    return version;
  });

  withTypeProvider.post('/snippets/:id/versions/:rev/revert', {
    schema: {
      tags: ['snippets'],
      params: z.object({ id: z.string(), rev: z.coerce.number().int().positive() }),
      body: revertSnippetVersionBodySchema,
      response: {
        200: snippetResponseSchema,
      },
    },
  }, async (request) => {
    const result = await service.revert(request.params.id, {
      targetRev: request.params.rev,
      actorId: request.body.actorId,
    });
    return result;
  });
};
