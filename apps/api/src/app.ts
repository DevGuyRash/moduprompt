import Fastify from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { prismaPlugin } from './plugins/prisma.js';
import { domainEventsPlugin } from './plugins/events.js';
import { exportPipelinePlugin } from './plugins/exportPipeline.js';
import { securityPlugin } from './plugins/security.js';
import { snippetsRoutes } from './modules/snippets/routes.js';
import { documentsRoutes } from './modules/documents/routes.js';
import { exportsRoutes } from './modules/exports/routes.js';
import { pluginsRoutes } from './modules/plugins/routes.js';
import { webhooksRoutes } from './modules/webhooks/routes.js';
import { auditRoutes } from './modules/audit/routes.js';

export const buildApp = async () => {
  const app = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  await app.register(prismaPlugin);
  await app.register(securityPlugin);
  await app.register(domainEventsPlugin);
  await app.register(exportPipelinePlugin);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ModuPrompt API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => ({ status: 'ready' }));

  await app.register(snippetsRoutes, { prefix: '/api' });
  await app.register(documentsRoutes, { prefix: '/api' });
  await app.register(exportsRoutes, { prefix: '/api' });
  await app.register(pluginsRoutes, { prefix: '/api' });
  await app.register(webhooksRoutes, { prefix: '/api' });
  await app.register(auditRoutes, { prefix: '/api' });

  return app;
};
