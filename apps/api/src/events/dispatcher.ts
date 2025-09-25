import pino, { type Logger } from 'pino';
import PQueue from 'p-queue';
import type { AuditLogEntry } from '@moduprompt/types';
import type { DomainEvent } from './domainEvents.js';
import type { AuditService } from '../modules/audit/service.js';
import type { WebhookDispatcher } from '../modules/webhooks/dispatcher.js';
import type { FastifyBaseLogger } from 'fastify';

export interface DispatchOptions {
  persistAudit?: boolean;
  triggerWebhooks?: boolean;
}

const defaultOptions: DispatchOptions = {
  persistAudit: true,
  triggerWebhooks: true,
};

export interface DomainEventDispatcherDependencies {
  auditService: AuditService;
  webhookDispatcher: WebhookDispatcher;
  logger?: FastifyBaseLogger;
}

export class DomainEventDispatcher {
  private readonly logger: Logger;
  private readonly queue = new PQueue({ concurrency: 1 });

  constructor(private readonly deps: DomainEventDispatcherDependencies) {
    const baseLogger = deps.logger ?? pino();
    this.logger = (baseLogger as Logger).child({ name: 'domain-event-dispatcher' });
  }

  async dispatch(event: DomainEvent, options: DispatchOptions = defaultOptions): Promise<void> {
    const merged = { ...defaultOptions, ...options };

    await this.queue.add(async () => {
      let entry: AuditLogEntry | undefined;

      if (merged.persistAudit) {
        try {
          entry = await this.deps.auditService.recordDomainEvent(event);
        } catch (error) {
          this.logger.error({ err: error, event: event.type }, 'failed to persist audit entry');
          throw error;
        }
      }

      if (merged.triggerWebhooks) {
        try {
          const auditId = entry?.id ?? event.id;
          await this.deps.webhookDispatcher.enqueue(event, auditId);
        } catch (error) {
          this.logger.error({ err: error, event: event.type }, 'failed to enqueue webhook delivery');
          throw error;
        }
      }
    });
  }
}
