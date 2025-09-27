import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply } from 'fastify';

import type { StaticAssetMetadata } from './staticAssets.js';

const parseDirective = (value: string | undefined): string[] =>
  value ? value.split(/\s+/u).filter(Boolean) : [];

const uniqueValues = (...lists: string[][]): string[] => {
  const merged = lists.flat();
  return Array.from(new Set(merged.filter(Boolean)));
};

const buildContentSecurityPolicy = (
  env: FastifyInstance['env'],
  metadata?: StaticAssetMetadata,
): string => {
  const scriptValues = uniqueValues(
    parseDirective(env.SECURITY_CSP_SCRIPT_SRC),
    parseDirective(env.SECURITY_CSP_SCRIPT_SRC_HASHES),
  );
  const styleValues = uniqueValues(
    parseDirective(env.SECURITY_CSP_STYLE_SRC),
    parseDirective(env.SECURITY_CSP_STYLE_SRC_HASHES),
  );

  const directives = new Map<string, string[]>([
    ['default-src', parseDirective(env.SECURITY_CSP_DEFAULT_SRC)],
    ['base-uri', parseDirective(env.SECURITY_CSP_BASE_URI)],
    ['frame-ancestors', parseDirective(env.SECURITY_CSP_FRAME_ANCESTORS)],
    ['form-action', parseDirective(env.SECURITY_CSP_FORM_ACTION)],
    ['connect-src', parseDirective(env.SECURITY_CSP_CONNECT_SRC)],
    ['img-src', parseDirective(env.SECURITY_CSP_IMG_SRC)],
    ['font-src', parseDirective(env.SECURITY_CSP_FONT_SRC)],
    ['object-src', parseDirective(env.SECURITY_CSP_OBJECT_SRC)],
    ['worker-src', parseDirective(env.SECURITY_CSP_WORKER_SRC)],
    ['manifest-src', parseDirective(env.SECURITY_CSP_MANIFEST_SRC)],
    ['prefetch-src', parseDirective(env.SECURITY_CSP_PREFETCH_SRC)],
    ['script-src', scriptValues.length > 0 ? scriptValues : ["'none'"]],
    ['style-src', styleValues.length > 0 ? styleValues : ["'none'"]],
  ]);

  if (metadata?.manifest) {
    directives.set('script-src', uniqueValues(directives.get('script-src') ?? [], ["'self'"]));
    directives.set('style-src', uniqueValues(directives.get('style-src') ?? [], ["'self'"]));
  }

  if (env.SECURITY_CSP_REPORT_URI) {
    directives.set('report-uri', parseDirective(env.SECURITY_CSP_REPORT_URI));
  }

  const serialized = Array.from(directives.entries())
    .filter(([, values]) => values.length > 0)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');

  return serialized;
};

const buildSecurityHeaders = (
  env: FastifyInstance['env'],
  metadata?: StaticAssetMetadata,
): Record<string, string> => {
  const headers: Record<string, string> = {
    'content-security-policy': buildContentSecurityPolicy(env, metadata),
    'referrer-policy': env.SECURITY_REFERRER_POLICY,
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'permissions-policy': env.SECURITY_PERMISSIONS_POLICY,
    'cross-origin-embedder-policy': env.SECURITY_CROSS_ORIGIN_EMBEDDER_POLICY,
    'cross-origin-opener-policy': env.SECURITY_CROSS_ORIGIN_OPENER_POLICY,
    'cross-origin-resource-policy': env.SECURITY_CROSS_ORIGIN_RESOURCE_POLICY,
    'strict-transport-security': env.SECURITY_STRICT_TRANSPORT_SECURITY,
  };

  if (env.SECURITY_REPORT_TO) {
    headers['report-to'] = env.SECURITY_REPORT_TO;
  }

  return headers;
};

const applySecurityHeaders = (
  reply: FastifyReply,
  headers: Record<string, string>,
): void => {
  for (const [key, value] of Object.entries(headers)) {
    if (!reply.hasHeader(key)) {
      reply.header(key, value);
    }
  }
};

export const securityPlugin = fp(async (app: FastifyInstance) => {
  let cachedHeaders: Record<string, string> | null = null;

  const ensureHeaders = (): Record<string, string> => {
    if (!cachedHeaders) {
      cachedHeaders = buildSecurityHeaders(app.env, app.staticAssetMetadata);
    }
    return cachedHeaders;
  };

  app.addHook('onReady', async () => {
    cachedHeaders = buildSecurityHeaders(app.env, app.staticAssetMetadata);
  });

  app.addHook('onSend', (request, reply, payload, done) => {
    applySecurityHeaders(reply, ensureHeaders());
    done(null, payload);
  });

  if (!app.hasContentTypeParser('application/csp-report')) {
    app.addContentTypeParser('application/csp-report', { parseAs: 'string' }, (_request, body, done) => {
      try {
        done(null, JSON.parse(body));
      } catch (error) {
        app.log.warn({ type: 'csp.report.parse_failed', error }, 'Failed to parse CSP report payload');
        done(null, {});
      }
    });
  }

  const cspReportPath = app.env.SECURITY_CSP_REPORT_URI;
  app.post<{ Body: Record<string, unknown> | undefined }>(cspReportPath, async (request, reply) => {
    const body = request.body ?? {};
    const reportSection = typeof body['csp-report'] === 'object' && body['csp-report'] !== null ? body['csp-report'] : body;
    const violation = typeof reportSection === 'object' && reportSection !== null ? (reportSection as Record<string, unknown>) : {};

    reply.code(202);

    app.log.warn(
      {
        type: 'csp.violation',
        directive: violation['violated-directive'] ?? violation['effective-directive'] ?? null,
        blockedUri: violation['blocked-uri'] ?? null,
        documentUri: violation['document-uri'] ?? null,
        referrer: violation['referrer'] ?? null,
        statusCode: reply.statusCode,
      },
      'CSP violation reported',
    );

    return reply.send({ received: true });
  });
});

export type { FastifyInstance } from 'fastify';
