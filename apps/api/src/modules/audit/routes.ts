import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { AuditRepository } from './repository.js';
import { AuditService } from './service.js';
import { z } from 'zod';
import {
  auditLogIngestRequestSchema,
  auditLogListQuerySchema,
  auditLogListResponseSchema,
} from './schemas.js';

export const auditRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuditService(new AuditRepository(app.prisma));
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.get('/audit/logs', {
    schema: {
      tags: ['audit'],
      querystring: auditLogListQuerySchema,
      response: {
        200: auditLogListResponseSchema,
      },
    },
  }, async (request) => {
    const { items, nextCursor } = await service.list(request.query);
    return { items, nextCursor };
  });

  withTypeProvider.post('/audit/ingest', {
    schema: {
      tags: ['audit'],
      body: auditLogIngestRequestSchema,
      response: {
        202: z.object({ accepted: z.literal(true) }),
      },
    },
  }, async (request, reply) => {
    await service.ingest(request.body);
    reply.code(202);
    return { accepted: true };
  });
};
