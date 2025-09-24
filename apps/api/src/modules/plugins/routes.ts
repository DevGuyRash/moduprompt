import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { PluginService } from './service.js';
import { pluginQuerySchema, registerPluginSchema } from './schemas.js';

const pluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  kind: z.string(),
  manifest: z.record(z.any()),
  enabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const pluginListSchema = z.object({ items: z.array(pluginSchema) });

export const pluginsRoutes: FastifyPluginAsync = async (app) => {
  const service = new PluginService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.get('/plugins', {
    schema: {
      tags: ['plugins'],
      querystring: pluginQuerySchema,
      response: {
        200: pluginListSchema,
      },
    },
  }, async (request) => {
    const items = await service.list(request.query.enabled);
    return { items };
  });

  withTypeProvider.post('/plugins', {
    schema: {
      tags: ['plugins'],
      body: registerPluginSchema,
      response: {
        201: pluginSchema,
      },
    },
  }, async (request, reply) => {
    const { actorId, ...payload } = request.body;
    const plugin = await service.register({ ...payload, actorId });
    reply.code(201);
    return plugin;
  });
};
