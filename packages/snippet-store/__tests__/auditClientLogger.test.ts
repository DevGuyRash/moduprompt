import { describe, it, expect } from 'vitest';
import type { AuditLogEntry } from '@moduprompt/types';
import { mergeAuditFeeds } from '../src/audit/clientLogger.js';

describe('mergeAuditFeeds', () => {
  const createEntry = (id: string, occurredAt: string): AuditLogEntry => ({
    id,
    type: 'document.status.changed',
    subjectId: 'doc-1',
    metadata: {},
    occurredAt,
    createdAt: Date.parse(occurredAt),
    updatedAt: Date.parse(occurredAt),
  });

  it('orders remote and buffered entries by occurredAt', () => {
    const persisted = [createEntry('stored-1', '2025-01-01T10:00:00.000Z')];
    const buffered = [
      {
        id: 'pending-1',
        entry: createEntry('pending-1', '2025-01-01T12:00:00.000Z'),
        bufferedAt: Date.parse('2025-01-01T12:05:00.000Z'),
        attempts: 0,
      },
    ];

    const merged = mergeAuditFeeds(persisted, buffered);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe('pending-1');
    expect(merged[0]?.pending).toBe(true);
    expect(merged[1]?.id).toBe('stored-1');
  });
});
