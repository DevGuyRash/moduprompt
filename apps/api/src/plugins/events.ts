import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { DomainEventDispatcher } from '../events/dispatcher.js';
import { AuditRepository } from '../modules/audit/repository.js';
import { AuditService } from '../modules/audit/service.js';
import { WebhookDispatcher } from '../modules/webhooks/dispatcher.js';

declare module 'fastify' {
  interface FastifyInstance {
    events: DomainEventDispatcher;
  }
}

export const domainEventsPlugin = fp(async (app: FastifyInstance) => {
  const auditRepository = new AuditRepository(app.prisma);
  const auditService = new AuditService(auditRepository);
  const webhookDispatcher = new WebhookDispatcher(app, {
    retryLimit: app.env.WEBHOOK_RETRY_LIMIT,
    timeoutMs: app.env.WEBHOOK_TIMEOUT_MS,
    backoffMinMs: app.env.WEBHOOK_BACKOFF_MIN_MS,
    backoffMaxMs: app.env.WEBHOOK_BACKOFF_MAX_MS,
  });

  app.decorate(
    'events',
    new DomainEventDispatcher({
      auditService,
      webhookDispatcher,
      logger: app.log,
    }),
  );
});
