import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';
import { WebhookService } from './service.js';
import {
  createWebhookSubscriptionSchema,
  updateWebhookSubscriptionSchema,
  webhookParamsSchema,
} from './schemas.js';

const webhookResponseSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  secret: z.string().nullable().optional(),
  events: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  disabledAt: z.number().nullable().optional(),
});

const webhookListSchema = z.object({ items: z.array(webhookResponseSchema) });

type WebhookResponse = z.infer<typeof webhookResponseSchema>;
type WebhookListResponse = z.infer<typeof webhookListSchema>;
type CreateWebhookSubscription = z.infer<typeof createWebhookSubscriptionSchema>;
type UpdateWebhookSubscription = z.infer<typeof updateWebhookSubscriptionSchema>;
type WebhookRouteParams = z.infer<typeof webhookParamsSchema>;

export const webhooksRoutes: FastifyPluginAsync = async (app) => {
  const service = new WebhookService(app);
  const withTypeProvider = app.withTypeProvider<ZodTypeProvider>();

  withTypeProvider.get<{ Reply: WebhookListResponse }>('/webhooks/subscriptions', {
    schema: {
      tags: ['webhooks'],
      response: {
        200: webhookListSchema,
      },
    },
  }, async () => {
    const items = await service.list();
    return { items };
  });

  withTypeProvider.post<{ Body: CreateWebhookSubscription; Reply: WebhookResponse }>('/webhooks/subscriptions', {
    schema: {
      tags: ['webhooks'],
      body: createWebhookSubscriptionSchema,
      response: {
        201: webhookResponseSchema,
      },
    },
  }, async (request, reply) => {
    const subscription = await service.create(request.body);
    reply.code(201);
    return subscription;
  });

  withTypeProvider.patch<{
    Params: WebhookRouteParams;
    Body: UpdateWebhookSubscription & { disabled?: boolean };
    Reply: WebhookResponse;
  }>('/webhooks/subscriptions/:id', {
    schema: {
      tags: ['webhooks'],
      params: webhookParamsSchema,
      body: updateWebhookSubscriptionSchema,
      response: {
        200: webhookResponseSchema,
      },
    },
  }, async (request) => {
    const { disabled, ...payload } = request.body;
    const subscription = await service.update(request.params.id, {
      ...payload,
      disabled,
    });
    return subscription;
  });
};
