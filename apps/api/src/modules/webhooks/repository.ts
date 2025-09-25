import type { PrismaClient } from '@prisma/client';
import { toStringArrayJson } from '../shared/prismaJson.js';

export interface WebhookSubscriptionRecord {
  id: string;
  url: string;
  secret?: string | null;
  events: string[];
  createdAt: number;
  updatedAt: number;
  disabledAt?: number | null;
}

export class WebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<WebhookSubscriptionRecord[]> {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return subscriptions.map((record) => ({
      id: record.id,
      url: record.url,
      secret: record.secret,
      events: (record.events as string[]) ?? [],
      createdAt: record.createdAt.getTime(),
      updatedAt: record.updatedAt.getTime(),
      disabledAt: record.disabledAt?.getTime() ?? null,
    }));
  }

  async create(input: { url: string; secret?: string; events: string[] }): Promise<WebhookSubscriptionRecord> {
    const record = await this.prisma.webhookSubscription.create({
      data: {
        url: input.url,
        secret: input.secret,
        events: toStringArrayJson(input.events),
      },
    });
    return {
      id: record.id,
      url: record.url,
      secret: record.secret,
      events: (record.events as string[]) ?? [],
      createdAt: record.createdAt.getTime(),
      updatedAt: record.updatedAt.getTime(),
      disabledAt: record.disabledAt?.getTime() ?? null,
    };
  }

  async update(id: string, input: { url?: string; secret?: string; events?: string[]; disabled?: boolean }): Promise<WebhookSubscriptionRecord> {
    const record = await this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        url: input.url,
        secret: input.secret,
        events: input.events ? toStringArrayJson(input.events) : undefined,
        disabledAt: typeof input.disabled === 'boolean' ? (input.disabled ? new Date() : null) : undefined,
      },
    });
    return {
      id: record.id,
      url: record.url,
      secret: record.secret,
      events: (record.events as string[]) ?? [],
      createdAt: record.createdAt.getTime(),
      updatedAt: record.updatedAt.getTime(),
      disabledAt: record.disabledAt?.getTime() ?? null,
    };
  }
}
