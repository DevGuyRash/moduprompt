import type { FastifyInstance } from 'fastify';
import { WebhookRepository, type WebhookSubscriptionRecord } from './repository.js';

export class WebhookService {
  private readonly repository: WebhookRepository;

  constructor(private readonly app: FastifyInstance, repository?: WebhookRepository) {
    this.repository = repository ?? new WebhookRepository(app.prisma);
  }

  list(): Promise<WebhookSubscriptionRecord[]> {
    return this.repository.list();
  }

  create(input: { url: string; secret?: string; events: string[] }): Promise<WebhookSubscriptionRecord> {
    return this.repository.create(input);
  }

  update(
    id: string,
    input: { url?: string; secret?: string; events?: string[]; disabled?: boolean },
  ): Promise<WebhookSubscriptionRecord> {
    return this.repository.update(id, input);
  }
}
