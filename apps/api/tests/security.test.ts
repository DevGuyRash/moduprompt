import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('security headers', () => {
  it('applies strict security headers on responses', async () => {
    const app = await buildApp();
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');

    await app.close();
  });
});
