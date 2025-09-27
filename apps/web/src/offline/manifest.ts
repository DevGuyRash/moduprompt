export interface CacheManifest {
  version: string;
  assets: string[];
  routes: string[];
}

interface ViteManifestEntry {
  file: string;
  css?: string[];
  assets?: string[];
  isEntry?: boolean;
}

type ViteManifest = Record<string, ViteManifestEntry>;

const STATIC_ROUTES = ['/', '/app', '/app/snippets', '/app/governance', '/app/settings'];

const releaseVersion = import.meta.env.MODUPROMPT_RELEASE ?? 'dev';

const toAbsolute = (value: string): string => (value.startsWith('/') ? value : `/${value}`);

export const resolveCacheManifest = async (): Promise<CacheManifest> => {
  try {
    const response = await fetch('/manifest.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch Vite manifest: ${response.status}`);
    }

    const manifest = (await response.json()) as ViteManifest;
    const assets = new Set<string>();

    for (const entry of Object.values(manifest)) {
      if (entry.file) {
        assets.add(toAbsolute(entry.file));
      }
      for (const css of entry.css ?? []) {
        assets.add(toAbsolute(css));
      }
      for (const asset of entry.assets ?? []) {
        assets.add(toAbsolute(asset));
      }
    }

    assets.add('/');
    assets.add('/index.html');
    assets.add('/manifest.webmanifest');
    assets.add('/favicon.svg');

    return {
      version: releaseVersion,
      assets: Array.from(assets),
      routes: STATIC_ROUTES,
    } satisfies CacheManifest;
  } catch (error) {
    console.warn('Falling back to minimal cache manifest', error);
    return {
      version: releaseVersion,
      assets: ['/', '/index.html', '/manifest.webmanifest'],
      routes: STATIC_ROUTES,
    } satisfies CacheManifest;
  }
};
