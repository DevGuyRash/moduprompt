import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('@fastify/type-provider-zod', () => ({
  ZodTypeProvider: class {},
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const dbPath = join(projectRoot, '.tmp', 'test.db');
const exportsDir = join(projectRoot, '.tmp', 'exports');
const staticRootDir = join(projectRoot, '.tmp', 'static');

let prisma: PrismaClient;

const applyMigration = async () => {
  const migrationPath = join(projectRoot, '../prisma/migrations/0001_init/migration.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.$executeRawUnsafe(statement);
  }
};

const seedStatuses = async () => {
  await prisma.workspaceStatus.createMany({
    data: [
      {
        key: 'draft',
        name: 'Draft',
        color: '#9ca3af',
        description: 'Work in progress',
        order: 0,
      },
      {
        key: 'ready',
        name: 'Ready for Export',
        color: '#22c55e',
        description: 'Approved for distribution',
        order: 1,
        isFinal: true,
      },
    ],
    skipDuplicates: true,
  });
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.EXPORT_QUEUE_CONCURRENCY = '1';
  process.env.EXPORT_QUEUE_RETRY_LIMIT = '0';
  process.env.EXPORT_JOB_TIMEOUT_MS = '5000';
  process.env.EXPORT_PDF_TIMEOUT_MS = '5000';
  process.env.EXPORT_PDF_RENDERER = 'stub';
  process.env.EXPORT_STORAGE_DRIVER = 'local';
  process.env.EXPORT_LOCAL_STORAGE_PATH = exportsDir;
  process.env.WEBHOOK_RETRY_LIMIT = '2';
  process.env.WEBHOOK_BACKOFF_MIN_MS = '100';
  process.env.WEBHOOK_BACKOFF_MAX_MS = '1000';
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  if (existsSync(dbPath)) {
    rmSync(dbPath);
  }
  if (existsSync(exportsDir)) {
    rmSync(exportsDir, { recursive: true, force: true });
  }
  mkdirSync(exportsDir, { recursive: true });
  if (existsSync(staticRootDir)) {
    rmSync(staticRootDir, { recursive: true, force: true });
  }
  mkdirSync(staticRootDir, { recursive: true });
  process.env.STATIC_ROOT = staticRootDir;
  const hashedScriptHref = '/assets/index-test.js';
  const hashedStyleHref = '/assets/index-test.css';
  const hashedScriptFile = hashedScriptHref.slice(1);
  const hashedStyleFile = hashedStyleHref.slice(1);
  const indexHtml = `<!doctype html><html><head><title>ModuPrompt Test Shell</title><link rel="modulepreload" href="${hashedScriptHref}"/><link rel="stylesheet" href="${hashedStyleHref}"/></head><body><div id="root">stub</div><script src="${hashedScriptHref}" type="module"></script></body></html>`;
  const appJs = 'export const ready = true;';
  const hashedJs = "console.log('hashed bundle loaded');";
  const hashedCss = 'body{background:#000;}';
  const stylesheet = ':root{color-scheme:dark;}';
  const writeFile = (filePath: string, contents: string) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    mkdirSync(dirname(filePath), { recursive: true });
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    writeFileSync(filePath, contents);
  };
  writeFile(join(staticRootDir, 'index.html'), indexHtml);
  writeFile(join(staticRootDir, 'app.js'), appJs);
  writeFile(join(staticRootDir, hashedScriptFile), hashedJs);
  writeFile(join(staticRootDir, hashedStyleFile), hashedCss);
  writeFile(join(staticRootDir, 'styles', 'app.css'), stylesheet);
  writeFile(
    join(staticRootDir, 'manifest.json'),
    JSON.stringify(
      {
        'src/main.tsx': {
          file: hashedScriptFile,
          css: [hashedStyleFile],
        },
      },
      null,
      2,
    ),
  );
  process.env.DATABASE_URL = `file:${dbPath}`;
  prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  await applyMigration();
  await seedStatuses();

  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  }));
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
});

beforeEach(async () => {
  if (existsSync(exportsDir)) {
    rmSync(exportsDir, { recursive: true, force: true });
    mkdirSync(exportsDir, { recursive: true });
  }
  await prisma.auditLogEntry.deleteMany();
  await prisma.webhookSubscription.deleteMany();
  await prisma.exportJob.deleteMany();
  await prisma.exportRecipe.deleteMany();
  await prisma.snippetVersion.deleteMany();
  await prisma.snippet.deleteMany();
  await prisma.document.deleteMany();
  await prisma.pluginRegistry.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  vi.unstubAllGlobals();
});

export const getPrisma = () => prisma;
