import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('security headers', () => {
  it('applies strict security headers on responses', async () => {
    const app = await buildApp();
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['content-security-policy']).toContain("style-src 'self'");
    expect(response.headers['content-security-policy']).toContain('report-uri /api/security/csp-report');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');

    await app.close();
  });

  it('accepts CSP violation reports', async () => {
    const app = await buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/security/csp-report',
      headers: { 'content-type': 'application/csp-report' },
      payload: {
        'csp-report': {
          'violated-directive': 'script-src',
          'blocked-uri': 'inline',
        },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({ received: true });

    await app.close();
  });
});
