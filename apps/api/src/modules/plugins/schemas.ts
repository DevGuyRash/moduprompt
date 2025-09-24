import { z } from 'zod';
import { pluginSchema } from '../shared/schemas.js';

export const registerPluginSchema = pluginSchema.extend({ actorId: z.string().optional() });

export const pluginQuerySchema = z.object({ enabled: z.coerce.boolean().optional() });
