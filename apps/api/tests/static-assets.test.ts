import { describe, it, expect } from 'vitest';

import { buildApp } from '../src/app.js';

const buildServer = async () => {
  const app = await buildApp();
  await app.ready();
  return app;
};

describe('static assets plugin', () => {
  it('serves the SPA shell at root', async () => {
    const app = await buildServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('ModuPrompt Test Shell');
    } finally {
      await app.close();
    }
  });

  it('returns index fallback for deep links outside API namespace', async () => {
    const app = await buildServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/workspace/demo' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('ModuPrompt Test Shell');
    } finally {
      await app.close();
    }
  });

  it('preserves JSON 404 responses for unknown API routes', async () => {
    const app = await buildServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/api/not-a-route' });
      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.json()).toMatchObject({ error: 'Not Found' });
    } finally {
      await app.close();
    }
  });

  it('streams static asset files with long-lived cache headers', async () => {
    const app = await buildServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/app.js' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(response.headers['content-type']).toContain('javascript');
      expect(response.body).toContain('ready');
    } finally {
      await app.close();
    }
  });
});
