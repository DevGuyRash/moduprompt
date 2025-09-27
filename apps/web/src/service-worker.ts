/// <reference lib="webworker" />

import { resolveCacheManifest, type CacheManifest } from './offline/manifest.js';

declare const self: ServiceWorkerGlobalScope;

const RELEASE_VERSION = (self as unknown as { __MODUPROMPT_RELEASE__?: string }).__MODUPROMPT_RELEASE__ ??
  (import.meta as unknown as { env?: Record<string, string> }).env?.MODUPROMPT_RELEASE ??
  'dev';

const SHELL_CACHE_PREFIX = 'moduprompt-shell';
const SYNC_TAG = 'moduprompt-sync';

const cacheName = (manifest: CacheManifest): string => `${SHELL_CACHE_PREFIX}-${manifest.version}`;

let manifestSnapshot: CacheManifest | null = null;

const getManifest = async (): Promise<CacheManifest> => {
  if (manifestSnapshot) {
    return manifestSnapshot;
  }
  manifestSnapshot = await resolveCacheManifest();
  return manifestSnapshot;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const manifest = await getManifest();
      const cache = await caches.open(cacheName(manifest));
      await cache.addAll([...new Set([...manifest.assets, ...manifest.routes])]);
      await self.skipWaiting();
    })().catch((error) => {
      console.error('Service worker installation failed', error);
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const manifest = await getManifest();
      const expected = cacheName(manifest);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(SHELL_CACHE_PREFIX) && key !== expected)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) {
      return;
    }
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(notifyClients('SYNC_REQUEST'));
  }
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === 'CACHE_REFRESH') {
    event.waitUntil(refreshShellCache());
  }
});

const handleNavigationRequest = async (request: Request): Promise<Response> => {
  const manifest = await getManifest();
  const shellCache = await caches.open(cacheName(manifest));
  const fallback = await shellCache.match('/index.html');
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await shellCache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.warn('Navigation fetch failed; serving offline fallback', error);
  }
  return fallback ?? Response.error();
};

const cacheFirst = async (request: Request): Promise<Response> => {
  const manifest = await getManifest();
  const shellCache = await caches.open(cacheName(manifest));
  const cached = await shellCache.match(request);
  if (cached) {
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          void shellCache.put(request, response.clone());
        }
      })
      .catch(() => {
        /* ignore */
      });
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await shellCache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.warn('Asset fetch failed', error);
  }
  return cached ?? Response.error();
};

const refreshShellCache = async (): Promise<void> => {
  manifestSnapshot = await resolveCacheManifest();
  const manifest = manifestSnapshot;
  const cache = await caches.open(cacheName(manifest));
  await cache.addAll([...new Set([...manifest.assets, ...manifest.routes])]);
};

const notifyClients = async (type: string): Promise<void> => {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(
    clients.map((client) => client.postMessage({ type, releasedAt: RELEASE_VERSION })),
  );
};
