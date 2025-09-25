import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { PluginService } from './service.js';
import { pluginQuerySchema, registerPluginSchema } from './schemas.js';

type PluginResponse = z.infer<typeof pluginSchema>;
type PluginListResponse = z.infer<typeof pluginListSchema>;
type PluginQuery = z.infer<typeof pluginQuerySchema>;
type RegisterPluginRequest = z.infer<typeof registerPluginSchema>;

const pluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  kind: z.string(),
  manifest: z.record(z.string(), z.any()),
  enabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const pluginListSchema = z.object({ items: z.array(pluginSchema) });

export const pluginsRoutes: FastifyPluginAsync = async (app) => {
  const service = new PluginService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.route<{ Querystring: PluginQuery; Reply: PluginListResponse }>({
    method: 'GET',
    url: '/plugins',
    schema: {
      tags: ['plugins'],
      querystring: pluginQuerySchema,
      response: {
        200: pluginListSchema,
      },
    },
    handler: async (request) => {
      const items = await service.list(request.query.enabled);
      return { items };
    },
  });

  withTypeProvider.route<{ Body: RegisterPluginRequest; Reply: PluginResponse }>({
    method: 'POST',
    url: '/plugins',
    schema: {
      tags: ['plugins'],
      body: registerPluginSchema,
      response: {
        201: pluginSchema,
      },
    },
    handler: async (request, reply) => {
      const { actorId, ...payload } = request.body;
      const plugin = await service.register({ ...payload, actorId });
      reply.code(201);
      return plugin;
    },
  });
};
