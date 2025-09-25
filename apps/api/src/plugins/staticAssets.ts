import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { SetHeadersResponse } from '@fastify/static';
import fp from 'fastify-plugin';
import type { FastifyBaseLogger, FastifyPluginAsync } from 'fastify';

import { loadEnv } from '../config/env.js';

const INDEX_DOCUMENT = 'index.html';

const ensureStaticRoot = async (root: string, log: FastifyBaseLogger): Promise<void> => {
  try {
    const stats = await stat(root);
    if (!stats.isDirectory()) {
      log.error({ root }, 'STATIC_ROOT is not a directory');
      throw new Error(`STATIC_ROOT must point to a directory. Received: ${root}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      log.error({ root }, 'STATIC_ROOT directory not found');
      throw new Error(`STATIC_ROOT directory does not exist: ${root}`);
    }
    throw error;
  }
};

const buildStaticPlugin: FastifyPluginAsync = async (app) => {
  const env = loadEnv();
  const staticRoot = resolve(env.STATIC_ROOT);

  await ensureStaticRoot(staticRoot, app.log);
  app.log.info({ staticRoot }, 'Serving static assets from STATIC_ROOT');

  await app.register(fastifyStatic, {
    root: staticRoot,
    index: INDEX_DOCUMENT,
    redirect: false,
    wildcard: false,
    setHeaders: (res: SetHeadersResponse, pathName: string, _stat: Stats) => {
      if (pathName.endsWith('.html')) {
        res.setHeader('cache-control', 'no-cache');
        return;
      }
      res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    },
  });

  app.get('/*', async (request, reply) => {
    const { url, method } = request;
    if (method !== 'GET' && method !== 'HEAD') {
      return reply.callNotFound();
    }

    if (url.startsWith('/api/')) {
      return reply.callNotFound();
    }

    reply.type('text/html');
    return reply.sendFile(INDEX_DOCUMENT);
  });
};

export const staticAssetsPlugin = fp(buildStaticPlugin, {
  name: 'static-assets',
});
