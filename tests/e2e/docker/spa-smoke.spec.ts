import { test, expect } from '@playwright/test';

const baseUrl = process.env.DOCKER_SMOKE_BASE_URL;

test.skip(!baseUrl, 'Set DOCKER_SMOKE_BASE_URL to run Docker smoke tests.');

test.describe('Docker Compose SPA smoke', () => {
  test('serves the SPA shell at root', async ({ request, baseURL }) => {
    const response = await request.get('/', { timeout: 10_000 });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    const body = await response.text();
    expect(body.toLowerCase()).toContain('<!doctype html>');
    expect(body).toMatch(/<div[^>]*id="root"/i);
    expect(baseURL).toBeTruthy();
  });

  test('streams hashed assets with cache headers', async ({ request }) => {
    const response = await request.get('/app.js', { timeout: 10_000 });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/javascript|ecmascript/i);
  });

  test('retains JSON 404 for unknown API routes', async ({ request }) => {
    const response = await request.get('/api/not-found', { timeout: 10_000 });
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
    const payload = await response.json();
    expect(payload).toMatchObject({ error: 'Not Found' });
  });

  test('exposes PWA manifest with offline start URL', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest', { timeout: 10_000 });
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/application\/(manifest\+json|json)/i);
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: expect.any(String),
      start_url: '/',
      display: expect.stringMatching(/standalone|minimal-ui/),
    });
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('publishes service worker for offline caching', async ({ request }) => {
    const response = await request.get('/service-worker.js', { timeout: 10_000 });
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/javascript/);
    const body = await response.text();
    expect(body).toMatch(/self\.addEventListener/);
    expect(body).toMatch(/moduprompt-shell/);
  });

});
