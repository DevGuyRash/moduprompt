import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': [
    "default-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "script-src 'none'",
    "style-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
  ].join('; '),
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'permissions-policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', '),
  'cross-origin-embedder-policy': 'require-corp',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};

const applySecurityHeaders = (reply: import('fastify').FastifyReply): void => {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!reply.hasHeader(key)) {
      reply.header(key, value);
    }
  }
};

export const securityPlugin = fp(async (app: FastifyInstance) => {
  app.addHook('onSend', (request, reply, payload, done) => {
    applySecurityHeaders(reply);
    done(null, payload);
  });
});

export type { FastifyInstance } from 'fastify';
