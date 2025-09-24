import { z } from 'zod';
import { webhookSubscriptionSchema } from '../shared/schemas.js';

export const createWebhookSubscriptionSchema = webhookSubscriptionSchema;

export const updateWebhookSubscriptionSchema = webhookSubscriptionSchema.partial().extend({
  disabled: z.boolean().optional(),
});

export const webhookParamsSchema = z.object({ id: z.string() });
