import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const DEFAULT_STATIC_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../web/dist',
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  WEBHOOK_RETRY_LIMIT: z.coerce.number().int().min(0).default(5),
  WEBHOOK_BACKOFF_MIN_MS: z.coerce.number().int().min(100).default(500),
  WEBHOOK_BACKOFF_MAX_MS: z.coerce.number().int().min(1000).default(30000),
  EXPORT_QUEUE_CONCURRENCY: z.coerce.number().int().min(1).default(2),
  EXPORT_QUEUE_RETRY_LIMIT: z.coerce.number().int().min(0).default(3),
  EXPORT_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  EXPORT_PDF_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  EXPORT_STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  EXPORT_LOCAL_STORAGE_PATH: z.string().min(1).default('.tmp/exports'),
  EXPORT_ARTIFACT_PREFIX: z.string().min(1).default('exports'),
  EXPORT_S3_BUCKET: z.string().optional(),
  EXPORT_S3_ENDPOINT: z.string().optional(),
  EXPORT_S3_REGION: z.string().optional(),
  EXPORT_S3_ACCESS_KEY_ID: z.string().optional(),
  EXPORT_S3_SECRET_ACCESS_KEY: z.string().optional(),
  EXPORT_S3_FORCE_PATH_STYLE: z.coerce.boolean().optional(),
  EXPORT_PDF_RENDERER: z.enum(['puppeteer', 'stub']).default('stub'),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  STATIC_ROOT: z.string().min(1).default(DEFAULT_STATIC_ROOT),
  SECURITY_CSP_DEFAULT_SRC: z.string().default("'none'"),
  SECURITY_CSP_BASE_URI: z.string().default("'self'"),
  SECURITY_CSP_FORM_ACTION: z.string().default("'self'"),
  SECURITY_CSP_FRAME_ANCESTORS: z.string().default("'none'"),
  SECURITY_CSP_CONNECT_SRC: z.string().default("'self'"),
  SECURITY_CSP_SCRIPT_SRC: z.string().default("'self'"),
  SECURITY_CSP_SCRIPT_SRC_HASHES: z.string().optional(),
  SECURITY_CSP_STYLE_SRC: z.string().default("'self'"),
  SECURITY_CSP_STYLE_SRC_HASHES: z.string().optional(),
  SECURITY_CSP_IMG_SRC: z.string().default("'self' data:"),
  SECURITY_CSP_FONT_SRC: z.string().default("'self' data:"),
  SECURITY_CSP_OBJECT_SRC: z.string().default("'none'"),
  SECURITY_CSP_WORKER_SRC: z.string().default("'self'"),
  SECURITY_CSP_MANIFEST_SRC: z.string().default("'self'"),
  SECURITY_CSP_PREFETCH_SRC: z.string().default("'self'"),
  SECURITY_CSP_REPORT_URI: z.string().default('/api/security/csp-report'),
  SECURITY_REPORT_TO: z.string().optional(),
  SECURITY_REFERRER_POLICY: z.string().default('no-referrer'),
  SECURITY_PERMISSIONS_POLICY: z
    .string()
    .default('camera=(), microphone=(), geolocation=(), interest-cohort=()'),
  SECURITY_STRICT_TRANSPORT_SECURITY: z
    .string()
    .default('max-age=31536000; includeSubDomains'),
  SECURITY_CROSS_ORIGIN_EMBEDDER_POLICY: z.string().default('require-corp'),
  SECURITY_CROSS_ORIGIN_OPENER_POLICY: z.string().default('same-origin'),
  SECURITY_CROSS_ORIGIN_RESOURCE_POLICY: z.string().default('same-origin'),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

export const loadEnv = (): Env => {
  if (cachedEnv) {
    return cachedEnv;
  }
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
};
