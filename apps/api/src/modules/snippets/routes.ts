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
const snippetParamsSchema = z.object({ id: z.string() });
const snippetVersionParamsSchema = z.object({ id: z.string(), rev: z.coerce.number().int().positive() });
const createSnippetRequestSchema = createSnippetBodySchema.extend({ actorId: z.string().optional() });

type SnippetResponse = z.infer<typeof snippetResponseSchema>;
type SnippetListResponse = z.infer<typeof snippetListSchema>;
type SnippetVersionResponse = z.infer<typeof snippetVersionSchema>;
type SnippetParams = z.infer<typeof snippetParamsSchema>;
type SnippetVersionParams = z.infer<typeof snippetVersionParamsSchema>;
type SnippetQuery = z.infer<typeof snippetQuerySchema>;
type CreateSnippetRequest = z.infer<typeof createSnippetRequestSchema>;
type UpdateSnippetRequest = z.infer<typeof updateSnippetBodySchema>;
type CreateSnippetVersionRequest = z.infer<typeof createSnippetVersionBodySchema>;
type RevertSnippetVersionRequest = z.infer<typeof revertSnippetVersionBodySchema>;

export const snippetsRoutes: FastifyPluginAsync = async (app) => {
  const service = new SnippetService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.get<{ Querystring: SnippetQuery; Reply: SnippetListResponse }>(
    '/snippets',
    {
      schema: {
        tags: ['snippets'],
        querystring: snippetQuerySchema,
        response: {
          200: snippetListSchema,
        },
      },
    },
    async (request) => {
      const items = await service.list(request.query);
      return { items };
    },
  );

  withTypeProvider.post<{ Body: CreateSnippetRequest; Reply: SnippetResponse }>(
    '/snippets',
    {
      schema: {
        tags: ['snippets'],
        body: createSnippetRequestSchema,
        response: {
          201: snippetResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { actorId, ...payload } = request.body;
      const result = await service.create(payload, actorId);
      reply.code(201);
      return {
        snippet: result.snippet,
        versions: [result.version],
      } satisfies SnippetResponse;
    },
  );

  withTypeProvider.get<{ Params: SnippetParams; Reply: SnippetResponse | { message: string } }>(
    '/snippets/:id',
    {
      schema: {
        tags: ['snippets'],
        params: snippetParamsSchema,
        response: {
          200: snippetResponseSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const result = await service.get(request.params.id);
      if (!result) {
        reply.code(404);
        return { message: 'Snippet not found' };
      }
      return result;
    },
  );

  withTypeProvider.patch<{ Params: SnippetParams; Body: UpdateSnippetRequest; Reply: SnippetResponse['snippet'] }>(
    '/snippets/:id',
    {
      schema: {
        tags: ['snippets'],
        params: snippetParamsSchema,
        body: updateSnippetBodySchema,
        response: {
          200: snippetResponseSchema.shape.snippet,
        },
      },
    },
    async (request) => {
      const snippet = await service.update(request.params.id, request.body);
      return snippet;
    },
  );

  withTypeProvider.post<{ Params: SnippetParams; Body: CreateSnippetVersionRequest; Reply: SnippetVersionResponse }>(
    '/snippets/:id/versions',
    {
      schema: {
        tags: ['snippets'],
        params: snippetParamsSchema,
        body: createSnippetVersionBodySchema,
        response: {
          201: snippetVersionSchema,
        },
      },
    },
    async (request, reply) => {
      const version = await service.createVersion(request.params.id, request.body);
      reply.code(201);
      return version;
    },
  );

  withTypeProvider.post<{
    Params: SnippetVersionParams;
    Body: RevertSnippetVersionRequest;
    Reply: SnippetResponse;
  }>(
    '/snippets/:id/versions/:rev/revert',
    {
      schema: {
        tags: ['snippets'],
        params: snippetVersionParamsSchema,
        body: revertSnippetVersionBodySchema,
        response: {
          200: snippetResponseSchema,
        },
      },
    },
    async (request) => {
      const result = await service.revert(request.params.id, {
        targetRev: request.params.rev,
        actorId: request.body.actorId,
      });
      return {
        snippet: result.snippet,
        versions: [result.version],
      } satisfies SnippetResponse;
    },
  );
};
