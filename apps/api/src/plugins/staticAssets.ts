import type { Stats } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { SetHeadersResponse } from '@fastify/static';
import fp from 'fastify-plugin';
import type { FastifyBaseLogger, FastifyPluginAsync } from 'fastify';

import { loadEnv } from '../config/env.js';

const INDEX_DOCUMENT = 'index.html';
const VITE_MANIFEST_FILE = 'manifest.json';

type ViteManifestEntry = {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
  assets?: string[];
  integrity?: string;
};

export type ViteManifest = Record<string, ViteManifestEntry>;

export type StaticAssetMetadata = {
  manifest: ViteManifest | null;
  hashedAssetPaths: Set<string>;
};

declare module 'fastify' {
  interface FastifyInstance {
    staticAssetMetadata: StaticAssetMetadata;
  }
}

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

const normalizeManifestPath = (value: string): string => `/${value.replace(/^\//u, '')}`;

const collectHashedAssets = (manifest: ViteManifest): Set<string> => {
  const assets = new Set<string>();
  for (const entry of Object.values(manifest)) {
    assets.add(normalizeManifestPath(entry.file));
    for (const css of entry.css ?? []) {
      assets.add(normalizeManifestPath(css));
    }
    for (const asset of entry.assets ?? []) {
      assets.add(normalizeManifestPath(asset));
    }
  }
  return assets;
};

const loadViteManifest = async (
  root: string,
  log: FastifyBaseLogger,
): Promise<StaticAssetMetadata> => {
  const manifestPath = resolve(root, VITE_MANIFEST_FILE);
  try {
    const contents = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(contents) as ViteManifest;
    const hashedAssetPaths = collectHashedAssets(manifest);
    log.info(
      { manifestPath, entries: Object.keys(manifest).length },
      'Loaded Vite manifest for static assets',
    );
    return { manifest, hashedAssetPaths };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      log.warn({ manifestPath }, 'Vite manifest not found; using conservative cache headers');
      return { manifest: null, hashedAssetPaths: new Set<string>() };
    }
    log.error({ err: error, manifestPath }, 'Failed to parse Vite manifest');
    throw error;
  }
};

const buildStaticPlugin: FastifyPluginAsync = async (app) => {
  const env = loadEnv();
  const staticRoot = resolve(env.STATIC_ROOT);

  await ensureStaticRoot(staticRoot, app.log);
  app.log.info({ staticRoot }, 'Serving static assets from STATIC_ROOT');

  const staticAssetMetadata = await loadViteManifest(staticRoot, app.log);
  app.decorate('staticAssetMetadata', staticAssetMetadata);

  await app.register(fastifyStatic, {
    root: staticRoot,
    index: INDEX_DOCUMENT,
    redirect: false,
    wildcard: false,
    setHeaders: (res: SetHeadersResponse, pathName: string, _stat: Stats) => {
      const relativePath = normalizeManifestPath(relative(staticRoot, pathName).replace(/\\/gu, '/'));
      if (relativePath.endsWith('.html')) {
        res.setHeader('cache-control', 'no-cache');
        return;
      }
      if (staticAssetMetadata.hashedAssetPaths.has(relativePath)) {
        res.setHeader('cache-control', 'public, max-age=31536000, immutable');
        return;
      }
      res.setHeader('cache-control', 'no-cache');
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
    reply.header('cache-control', 'no-cache');
    return reply.sendFile(INDEX_DOCUMENT);
  });

  app.addHook('onResponse', (request, reply, done) => {
    const method = request.method;
    if ((method !== 'GET' && method !== 'HEAD') || reply.statusCode >= 400) {
      done();
      return;
    }

    const urlPath = request.url.split('?')[0] ?? '/';
    if (urlPath.startsWith('/api/') || urlPath === '/healthz' || urlPath === '/readyz') {
      done();
      return;
    }

    const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
    const hashed = staticAssetMetadata.hashedAssetPaths.has(normalizedPath);
    const cachePolicy = hashed ? 'immutable' : 'no-cache';

    app.log.info(
      {
        type: 'static.asset',
        method,
        path: urlPath,
        statusCode: reply.statusCode,
        cachePolicy,
        hashed,
        responseTimeMs: typeof reply.getResponseTime === 'function' ? Math.round(reply.getResponseTime()) : undefined,
      },
      'static asset served',
    );

    done();
  });
};

export const staticAssetsPlugin = fp(buildStaticPlugin, {
  name: 'static-assets',
});
