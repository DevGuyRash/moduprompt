import type { AuditLogEntry, JsonObject, JsonValue } from '@moduprompt/types';
import type { WorkspaceStore } from '../dexie/workspaceStore.js';
import type { AuditBufferRecord } from './types.js';

const SENSITIVE_KEY_PATTERN = /(password|secret|token|key|credential|auth|email|phone|ssn)/i;
const MAX_STRING_LENGTH = 512;
const MAX_COLLECTION_ITEMS = 100;
const MAX_DEPTH = 6;

const sanitizeObject = (value: Record<string, unknown>, depth: number): JsonObject => {
  const sanitized: JsonObject = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    sanitized[key] = sanitizeValue(raw, depth + 1);
  }
  return sanitized;
};

const sanitizeValue = (value: unknown, depth = 0): JsonValue => {
  if (depth >= MAX_DEPTH) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_COLLECTION_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1)) as JsonValue[];
  }
  if (value && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>, depth);
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > MAX_STRING_LENGTH) {
      return `${normalized.slice(0, MAX_STRING_LENGTH - 1)}…`;
    }
    return normalized;
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
};

const sanitizeEntry = (entry: AuditLogEntry): AuditLogEntry => ({
  ...entry,
  metadata: sanitizeObject(entry.metadata, 0),
});

const ensureOpen = async (store: WorkspaceStore): Promise<void> => {
  const db = store.database;
  if (!db.isOpen()) {
    await db.open();
  }
};

export const bufferAuditEntry = async (store: WorkspaceStore, entry: AuditLogEntry): Promise<void> => {
  await ensureOpen(store);
  const sanitized = sanitizeEntry(entry);
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
