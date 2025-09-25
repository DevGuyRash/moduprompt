import Fastify from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from '@fastify/type-provider-zod';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { prismaPlugin } from './plugins/prisma.js';
import { domainEventsPlugin } from './plugins/events.js';
import { exportPipelinePlugin } from './plugins/exportPipeline.js';
import { securityPlugin } from './plugins/security.js';
import { staticAssetsPlugin } from './plugins/staticAssets.js';
import { snippetsRoutes } from './modules/snippets/routes.js';
import { documentsRoutes } from './modules/documents/routes.js';
import { exportsRoutes } from './modules/exports/routes.js';
import { pluginsRoutes } from './modules/plugins/routes.js';
import { webhooksRoutes } from './modules/webhooks/routes.js';
import { auditRoutes } from './modules/audit/routes.js';

export const buildApp = async () => {
  const app = Fastify({
    logger: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  await typedApp.register(prismaPlugin);
  await typedApp.register(securityPlugin);
  await typedApp.register(domainEventsPlugin);
  await typedApp.register(exportPipelinePlugin);
  await typedApp.register(staticAssetsPlugin);

  await typedApp.register(swagger, {
    openapi: {
      info: {
        title: 'ModuPrompt API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
    transform: jsonSchemaTransform,
  });

  await typedApp.register(swaggerUi, {
    routePrefix: '/docs',
  });

  typedApp.get('/healthz', async () => ({ status: 'ok' }));
  typedApp.get('/readyz', async () => ({ status: 'ready' }));

  await typedApp.register(snippetsRoutes, { prefix: '/api' });
  await typedApp.register(documentsRoutes, { prefix: '/api' });
  await typedApp.register(exportsRoutes, { prefix: '/api' });
  await typedApp.register(pluginsRoutes, { prefix: '/api' });
  await typedApp.register(webhooksRoutes, { prefix: '/api' });
  await typedApp.register(auditRoutes, { prefix: '/api' });

  return typedApp;
};
