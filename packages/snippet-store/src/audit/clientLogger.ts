import type { AuditLogEntry } from '@moduprompt/types';
import type { WorkspaceStore } from '../dexie/workspaceStore.js';
import type { AuditBufferRecord } from './types.js';
import { sanitizeAuditEntry } from './sanitize.js';

const ensureOpen = async (store: WorkspaceStore): Promise<void> => {
  const db = store.database;
  if (!db.isOpen()) {
    await db.open();
  }
};

export const bufferAuditEntry = async (store: WorkspaceStore, entry: AuditLogEntry): Promise<void> => {
  await ensureOpen(store);
  const sanitized = sanitizeAuditEntry(entry);
  const record: AuditBufferRecord = {
    id: sanitized.id,
    entry: sanitized,
    bufferedAt: Date.now(),
    attempts: 0,
  };
  await store.database.auditBuffer.put(record);
};

export const listBufferedAuditEntries = async (store: WorkspaceStore): Promise<AuditBufferRecord[]> => {
  await ensureOpen(store);
  return store.database.auditBuffer.orderBy('bufferedAt').toArray();
};

interface FlushOptions {
  batchSize?: number;
  onError?: (error: Error) => void;
}

export const flushBufferedAuditEntries = async (
  store: WorkspaceStore,
  sender: (entries: AuditLogEntry[]) => Promise<void>,
  options: FlushOptions = {},
): Promise<void> => {
  const batchSize = options.batchSize ?? 50;
  await ensureOpen(store);
  const table = store.database.auditBuffer;
  const records = await table.orderBy('bufferedAt').toArray();
  if (!records.length) {
    return;
  }

  const batches: AuditBufferRecord[][] = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const entries = batch.map((record) => record.entry);
    try {
      await sender(entries);
      await table.bulkDelete(batch.map((record) => record.id));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to deliver audit entries');
      options.onError?.(err);
      await Promise.all(
        batch.map(async (record) => {
          await table.put({
            ...record,
            attempts: record.attempts + 1,
            lastError: err.message,
          });
        }),
      );
      throw err;
    }
  }
};

export const mergeAuditFeeds = (
  persisted: AuditLogEntry[],
  buffered: AuditBufferRecord[],
): Array<AuditLogEntry & { pending?: boolean }> => {
  const pending = buffered.map((record) => ({ ...record.entry, pending: true as const }));
  const combined = [...persisted, ...pending];
  return combined.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
};
