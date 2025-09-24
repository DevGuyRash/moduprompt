import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nanoid } from 'nanoid';
import { buildApp } from '../src/app.js';
import { getPrisma } from './setup.js';

const waitForExportStatus = async (app: Awaited<ReturnType<typeof buildApp>>, id: string, expected: string, timeoutMs = 5000) => {
  const started = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await app.inject({ method: 'GET', url: `/api/exports/${id}` });
    if (response.statusCode === 200) {
      const body = response.json();
      if (body.status === expected) {
        return body;
      }
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for export ${id} to reach status ${expected}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

const snippetPayload = {
  title: 'Welcome Banner',
  path: 'marketing/welcome',
  frontmatter: {
    schemaVersion: 1,
    tags: ['welcome'],
    status: 'draft',
  },
  body: '# Hello world',
};

const documentPayload = {
  title: 'Launch Plan',
  schemaVersion: 2 as const,
  blocks: [],
  edges: [],
  variables: [],
  exportRecipes: [],
  tags: ['launch'],
  statusKey: 'draft',
  settings: {
    maxWidth: '96ch' as const,
  },
};

describe('ModuPrompt API integration', () => {
  const prisma = getPrisma();

  beforeEach(() => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();
  });

  it('creates snippets with version history and emits audit log entries', async () => {
    const app = await buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/snippets',
      payload: snippetPayload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.snippet.title).toBe(snippetPayload.title);
    expect(body.versions).toHaveLength(1);

    const auditLogs = await prisma.auditLogEntry.findMany();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.type).toBe('snippet.version.created');

    await app.close();
  });

  it('reverts snippet versions and records deterministic audit metadata', async () => {
    const app = await buildApp();
    await app.ready();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/snippets',
      payload: snippetPayload,
    });
    expect(createResponse.statusCode).toBe(201);
    const { snippet } = createResponse.json();

    const updated = await app.inject({
      method: 'POST',
      url: `/api/snippets/${snippet.id}/versions`,
      payload: {
        body: '# Hello world v2',
        frontmatter: { schemaVersion: 1, tags: ['welcome'] },
        note: 'Refinement',
      },
    });
    expect(updated.statusCode).toBe(201);

    const revertResponse = await app.inject({
      method: 'POST',
      url: `/api/snippets/${snippet.id}/versions/1/revert`,
      payload: { targetRev: 1, actorId: 'qa-user' },
    });
    expect(revertResponse.statusCode).toBe(200);
    const reverted = revertResponse.json();
    expect(reverted.snippet.headRev).toBe(3);
    expect(reverted.versions.at(-1)?.body).toBe(snippetPayload.body);

    const logs = await prisma.auditLogEntry.findMany({ orderBy: { createdAt: 'asc' } });
    const revertLog = logs.find((entry) => entry.type === 'snippet.version.reverted');
    expect(revertLog).toBeTruthy();
    expect(revertLog?.actorId).toBe('qa-user');
    expect(revertLog?.metadata).toMatchObject({
      rev: 3,
      revertedToRev: 1,
    });

    await app.close();
  });

  it('enforces export status gating and dispatches events on completion', async () => {
    const app = await buildApp();
    await app.ready();

    const documentResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: documentPayload,
    });
    expect(documentResponse.statusCode).toBe(201);
    const document = documentResponse.json();

    const recipe = await prisma.exportRecipe.create({
      data: {
        id: 'recipe-1',
        name: 'PDF ready',
        type: 'pdf',
        include: JSON.stringify({ all: true }),
        allowedStatuses: JSON.stringify(['ready']),
      },
    });

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/exports',
      payload: { documentId: document.id, recipeId: recipe.id },
    });
    expect(blocked.statusCode).toBe(400);

    const statusUpdate = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${document.id}/status`,
      payload: { statusKey: 'ready' },
    });
    expect(statusUpdate.statusCode).toBe(200);

    const jobResponse = await app.inject({
      method: 'POST',
      url: '/api/exports',
      payload: { documentId: document.id, recipeId: recipe.id, actorId: 'system' },
    });
    expect(jobResponse.statusCode).toBe(201);
    const job = jobResponse.json();

    const completedJob = await waitForExportStatus(app, job.id, 'completed');
    expect(completedJob.artifactUri).toBeTruthy();

    const storedJob = await prisma.exportJob.findUnique({ where: { id: job.id } });
    expect(storedJob?.status).toBe('completed');
    expect(storedJob?.metadata).toMatchObject({ attempt: 1 });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.length).toBe(0);

    await app.close();
  });

  it('registers webhook subscription and triggers webhook on snippet version', async () => {
    const app = await buildApp();
    await app.ready();

    await app.inject({
      method: 'POST',
      url: '/api/webhooks/subscriptions',
      payload: {
        url: 'https://example.com/webhook',
        events: ['snippet.version.created'],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/snippets',
      payload: snippetPayload,
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.length).toBe(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.com/webhook');
    const webhookRequest = fetchMock.mock.calls[0]?.[1] as { body?: string };
    expect(webhookRequest?.body).toBeTruthy();
    const body = webhookRequest?.body ? JSON.parse(webhookRequest.body) : null;
    expect(body?.event?.version?.body).toBeUndefined();

    await app.close();
  });

  it('ingests buffered audit events and redacts sensitive metadata', async () => {
    const app = await buildApp();
    await app.ready();

    const now = Date.now();
    const payload = {
      items: [
        {
          id: nanoid(),
          type: 'document.status.changed',
          subjectId: 'doc-local',
          occurredAt: new Date(now).toISOString(),
          createdAt: now,
          updatedAt: now,
          metadata: {
            from: 'draft',
            to: 'review',
            secretToken: 'should-not-leak',
          },
          actorId: 'offline-user',
        },
      ],
    };

    const ingest = await app.inject({
      method: 'POST',
      url: '/api/audit/ingest',
      payload,
    });
    expect(ingest.statusCode).toBe(202);

    const list = await app.inject({ method: 'GET', url: '/api/audit/logs?limit=10' });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { items: Array<Record<string, unknown>> };
    expect(Array.isArray(body.items)).toBe(true);
    const entry = body.items?.[0];
    expect(entry?.metadata?.secretToken).toBe('[REDACTED]');

    await app.close();
  });
});
