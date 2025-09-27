import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCacheManifest } from '../manifest.js';

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof fetch;
}

const originalFetch = globalThis.fetch;

describe('resolveCacheManifest', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('includes assets and routes from Vite manifest', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        'src/main.tsx': {
          file: 'assets/main-abc123.js',
          css: ['assets/main-abc123.css'],
          assets: ['favicon.svg'],
        },
      }),
    } as Partial<Response>;

    (fetch as unknown as vi.Mock).mockResolvedValue(mockResponse);

    const manifest = await resolveCacheManifest();
    expect(manifest.assets).toContain('/assets/main-abc123.js');
    expect(manifest.assets).toContain('/assets/main-abc123.css');
    expect(manifest.assets).toContain('/favicon.svg');
    expect(manifest.routes).toContain('/app');
  });

  it('falls back when manifest cannot be retrieved', async () => {
    (fetch as unknown as vi.Mock).mockResolvedValue({ ok: false, status: 404 } as Partial<Response>);

    const manifest = await resolveCacheManifest();
    expect(manifest.assets).toContain('/index.html');
    expect(manifest.assets).toContain('/manifest.webmanifest');
  });
});
