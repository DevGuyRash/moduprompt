import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { loadEnv } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    env: Env;
  }
}

export const prismaPlugin = fp(async (app: FastifyInstance) => {
  const env = loadEnv();
  const prisma = new PrismaClient({
    datasources: {
      db: { url: env.DATABASE_URL },
    },
  });

  app.decorate('prisma', prisma);
  app.decorate('env', env);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});

export type { PrismaClient };
