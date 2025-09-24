import { describe, it, expect, vi } from 'vitest';
import type { ExportRepository } from '../src/modules/exports/repository.js';
import type { ExportStorage } from '../src/modules/exports/storage.js';
import { ExportWorker } from '../src/modules/exports/worker.js';
import type { Env } from '../src/config/env.js';
import type { DomainEventDispatcher } from '../src/events/dispatcher.js';
import type { DocumentModel, ExportRecipe } from '@moduprompt/types';

const baseEnv: Env = {
  NODE_ENV: 'test',
  DATABASE_URL: 'file:test',
  PORT: 0,
  WEBHOOK_TIMEOUT_MS: 5000,
  WEBHOOK_RETRY_LIMIT: 0,
  WEBHOOK_BACKOFF_MIN_MS: 100,
  WEBHOOK_BACKOFF_MAX_MS: 1000,
  EXPORT_QUEUE_CONCURRENCY: 1,
  EXPORT_QUEUE_RETRY_LIMIT: 0,
  EXPORT_JOB_TIMEOUT_MS: 5000,
  EXPORT_PDF_TIMEOUT_MS: 5000,
  EXPORT_STORAGE_DRIVER: 'local',
  EXPORT_LOCAL_STORAGE_PATH: '.tmp/exports',
  EXPORT_ARTIFACT_PREFIX: 'exports',
  EXPORT_S3_BUCKET: undefined,
  EXPORT_S3_ENDPOINT: undefined,
  EXPORT_S3_REGION: undefined,
  EXPORT_S3_ACCESS_KEY_ID: undefined,
  EXPORT_S3_SECRET_ACCESS_KEY: undefined,
  EXPORT_S3_FORCE_PATH_STYLE: undefined,
  EXPORT_PDF_RENDERER: 'stub',
  PUPPETEER_EXECUTABLE_PATH: undefined,
};

const document: DocumentModel = {
  id: 'doc-1',
  title: 'Test Document',
  schemaVersion: 2,
  blocks: [
    {
      id: 'block-1',
      kind: 'markdown',
      body: '<script>alert(1)</script>## Heading',
      sequence: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  edges: [],
  variables: [],
  exportRecipes: [],
  tags: [],
  statusKey: 'ready',
  settings: { maxWidth: '96ch' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const recipe: ExportRecipe = {
  id: 'recipe-html',
  name: 'HTML export',
  type: 'html',
  include: { all: true },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('ExportWorker', () => {
  const buildWorker = (overrides?: Partial<ExportRepository>, storageImpl?: ExportStorage) => {
    const repository: ExportRepository = {
      getJobContext: vi.fn().mockResolvedValue({
        job: {
          id: 'job-1',
          status: 'queued',
          documentId: document.id,
          recipeId: recipe.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        document,
        recipe,
      }),
      markProcessing: vi.fn().mockResolvedValue(undefined),
      getSnippetBundles: vi.fn().mockResolvedValue([]),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
      markQueued: vi.fn().mockResolvedValue(undefined),
      createJob: vi.fn(),
      getDocument: vi.fn(),
      getRecipe: vi.fn(),
      getJob: vi.fn(),
      list: vi.fn(),
      updateJob: vi.fn(),
      ...overrides,
    } as unknown as ExportRepository;

    const storageCalls: unknown[] = [];
    const storage: ExportStorage = storageImpl ?? {
      put: vi.fn(async (input) => {
        storageCalls.push(input);
        return { uri: `file:///${input.key}`, size: input.body.length };
      }),
    } as unknown as ExportStorage;

    const events: DomainEventDispatcher = {
      dispatch: vi.fn().mockResolvedValue(undefined),
    } as unknown as DomainEventDispatcher;

    const worker = new ExportWorker({
      repository,
      storage,
      env: baseEnv,
      events,
    });

    return { worker, repository, storage, storageCalls, events };
  };

  it('stores sanitized HTML artifacts and marks jobs complete', async () => {
    const { worker, repository, storage, storageCalls, events } = buildWorker();
    const context = { attempt: 1, maxAttempts: 1, signal: new AbortController().signal, timeoutMs: 5000 };

    await worker.process('job-1', context);

    expect(repository.markProcessing).toHaveBeenCalledWith('job-1', expect.objectContaining({ attempt: 1 }));
    expect(storage.put).toHaveBeenCalledTimes(1);
    const payload = storageCalls[0] as { body: Buffer };
    expect(payload.body.toString('utf8')).not.toContain('<script>');
    expect(repository.markCompleted).toHaveBeenCalledWith('job-1', expect.objectContaining({
      artifactUri: expect.stringContaining('file:///'),
    }));
    expect(events.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'export.completed' }));
  });

  it('requeues job on transient failure and marks failed on final attempt', async () => {
    const failingStorage: ExportStorage = {
      put: vi.fn(async () => {
        throw new Error('network failure');
      }),
    } as ExportStorage;
    const { worker, repository, events } = buildWorker(undefined, failingStorage);
    const controller = new AbortController();
    const firstContext = { attempt: 1, maxAttempts: 2, signal: controller.signal, timeoutMs: 5000 };

    await expect(worker.process('job-1', firstContext)).rejects.toThrow('network failure');
    expect(repository.markQueued).toHaveBeenCalledWith('job-1', expect.objectContaining({ lastError: 'network failure' }));
    expect(repository.markFailed).not.toHaveBeenCalled();

    const secondContext = { attempt: 2, maxAttempts: 2, signal: controller.signal, timeoutMs: 5000 };
    await expect(worker.process('job-1', secondContext)).rejects.toThrow('network failure');
    expect(repository.markFailed).toHaveBeenCalledWith('job-1', expect.objectContaining({ error: 'network failure' }));
    expect(events.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'export.failed' }));
  });
});
