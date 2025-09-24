import { describe, it, expect, vi } from 'vitest';
import { AuditService } from '../src/modules/audit/service.js';
import type { AuditRepository } from '../src/modules/audit/repository.js';

const createRepository = () => ({
  upsert: vi.fn(),
  insertMany: vi.fn(),
  list: vi.fn(),
});

describe('AuditService', () => {
  it('redacts sensitive metadata when listing logs', async () => {
    const repository = createRepository();
    const now = Date.now();
    repository.list.mockResolvedValue({
      items: [
        {
          id: 'audit-1',
          type: 'document.status.changed',
          subjectId: 'doc-1',
          metadata: { secretKey: 'value', nested: { apiToken: 'abc' } },
          actorId: 'user-1',
          occurredAt: new Date(now).toISOString(),
          createdAt: now,
          updatedAt: now,
        },
      ],
      nextCursor: null,
    });
    const service = new AuditService(repository as unknown as AuditRepository);

    const result = await service.list({ limit: 10 });

    expect(repository.list).toHaveBeenCalledWith({ limit: 10 });
    expect(result.items[0]?.metadata.secretKey).toBe('[REDACTED]');
    expect(result.items[0]?.metadata.nested).toEqual({ apiToken: '[REDACTED]' });
  });
});
