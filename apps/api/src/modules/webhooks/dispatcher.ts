import PQueue from 'p-queue';
import pino from 'pino';
import type { FastifyInstance } from 'fastify';
import type { DomainEvent } from '../../events/domainEvents.js';

export interface WebhookDispatcherOptions {
  retryLimit: number;
  timeoutMs: number;
  backoffMinMs: number;
  backoffMaxMs: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const computeBackoff = (attempt: number, minMs: number, maxMs: number): number => {
  const delay = minMs * 2 ** (attempt - 1);
  return Math.min(delay, maxMs);
};

const sanitizeEventForWebhook = (event: DomainEvent): Record<string, unknown> => {
  switch (event.type) {
    case 'snippet.version.created':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        snippet: {
          id: event.snippet.id,
          title: event.snippet.title,
          path: event.snippet.path,
          headRev: event.snippet.headRev,
        },
        version: {
          rev: event.version.rev,
          note: event.version.note,
          authorId: event.version.author?.id,
          timestamp: event.version.timestamp,
        },
      } satisfies Record<string, unknown>;
    case 'snippet.version.reverted':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        snippet: {
          id: event.snippet.id,
          title: event.snippet.title,
          path: event.snippet.path,
        },
        version: {
          rev: event.version.rev,
          note: event.version.note,
          authorId: event.version.author?.id,
          timestamp: event.version.timestamp,
        },
        revertedToRev: event.revertedToRev,
      } satisfies Record<string, unknown>;
    case 'document.status.changed':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        document: {
          id: event.document.id,
          statusKey: event.document.statusKey,
        },
        previousStatus: event.previousStatus ?? null,
      } satisfies Record<string, unknown>;
    case 'document.tags.changed':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        document: {
          id: event.document.id,
          tags: event.document.tags,
        },
        previousTags: event.previousTags,
      } satisfies Record<string, unknown>;
    case 'export.created':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        exportJobId: event.exportJobId,
        documentId: event.documentId,
        recipe: {
          id: event.recipe.id,
          name: event.recipe.name,
        },
      } satisfies Record<string, unknown>;
    case 'export.completed':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        exportJobId: event.exportJobId,
        documentId: event.documentId,
        recipe: {
          id: event.recipe.id,
          name: event.recipe.name,
        },
        artifactUri: event.artifactUri,
      } satisfies Record<string, unknown>;
    case 'export.failed':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        exportJobId: event.exportJobId,
        documentId: event.documentId,
        recipe: {
          id: event.recipe.id,
          name: event.recipe.name,
        },
        error: event.error?.slice(0, 256) ?? 'unknown',
      } satisfies Record<string, unknown>;
    case 'plugin.installed':
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        plugin: {
          id: event.pluginId,
          name: event.name,
          version: event.version,
        },
      } satisfies Record<string, unknown>;
    default:
      return {
        type: event.type,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
      } satisfies Record<string, unknown>;
  }
};

export class WebhookDispatcher {
  private readonly queue = new PQueue({ concurrency: 1 });
  private readonly logger = pino({ name: 'webhook-dispatcher' });

  constructor(private readonly app: FastifyInstance, private readonly options: WebhookDispatcherOptions) {}

  enqueue(event: DomainEvent, auditId: string): Promise<void> {
    const payload = sanitizeEventForWebhook(event);
    return this.queue.add(() => this.process(event, auditId, payload));
  }

  private async process(event: DomainEvent, auditId: string, payload: Record<string, unknown>): Promise<void> {
    const subscriptions = await this.app.prisma.webhookSubscription.findMany({
      where: { disabledAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!subscriptions.length) {
      return;
    }

    for (const subscription of subscriptions) {
      const events = Array.isArray(subscription.events)
        ? (subscription.events as unknown[])
            .map((value) => (typeof value === 'string' ? value : null))
            .filter((value): value is string => Boolean(value))
        : [];

      if (events.length > 0 && !events.includes(event.type)) {
        continue;
      }

      await this.deliverWithRetry({ subscriptionId: subscription.id, url: subscription.url, secret: subscription.secret ?? '', event, auditId, payload });
    }
  }

  private async deliverWithRetry(args: {
    subscriptionId: string;
    url: string;
    secret: string;
    event: DomainEvent;
    auditId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const maxAttempts = this.options.retryLimit + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.send(args);
        if (attempt > 1) {
          this.logger.info({ subscriptionId: args.subscriptionId, attempt }, 'webhook delivery succeeded after retry');
        }
        return;
      } catch (error) {
        const isFinalAttempt = attempt >= maxAttempts;
        this.logger.warn(
          {
            subscriptionId: args.subscriptionId,
            attempt,
            error,
          },
          'webhook delivery attempt failed',
        );
        if (isFinalAttempt) {
          this.logger.error(
            {
              subscriptionId: args.subscriptionId,
              auditId: args.auditId,
              event: args.event.type,
            },
            'webhook delivery exhausted retries',
          );
          return;
        }
        const backoff = computeBackoff(attempt, this.options.backoffMinMs, this.options.backoffMaxMs);
        await sleep(backoff);
      }
    }
  }

  private async send({ subscriptionId, url, secret, event, auditId, payload }: {
    subscriptionId: string;
    url: string;
    secret: string;
    event: DomainEvent;
    auditId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ModuPrompt-Event': event.type,
          'X-ModuPrompt-Audit-Id': auditId,
          'X-ModuPrompt-Signature': secret,
        },
        body: JSON.stringify({
          auditId,
          event: payload,
          deliveredAt: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
