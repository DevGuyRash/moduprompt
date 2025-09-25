import type { AuditLogEntry, JsonObject, JsonValue } from '@moduprompt/types';
import { toAuditLogEntry } from '../../events/audit.js';
import type { DomainEvent } from '../../events/domainEvents.js';
import type { AuditLogIngestRequest, AuditLogListQuery } from './schemas.js';
import { AuditRepository } from './repository.js';

const SENSITIVE_KEY_PATTERN = /(password|secret|token|key|credential|auth|email|phone|ssn)/i;
const MAX_STRING_LENGTH = 512;
const MAX_COLLECTION_ITEMS = 100;
const MAX_DEPTH = 6;

const sanitizeObject = (value: Record<string, unknown>, depth: number): JsonObject => {
  const sanitized: JsonObject = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    sanitized[key] = sanitizeValue(rawValue, depth + 1);
  }
  return sanitized;
};

const sanitizeValue = (value: unknown, depth = 0): JsonValue => {
  if (depth >= MAX_DEPTH) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_COLLECTION_ITEMS).map((item) => sanitizeValue(item, depth + 1)) as JsonValue[];
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

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async recordDomainEvent(event: DomainEvent): Promise<AuditLogEntry> {
    const entry = sanitizeEntry(toAuditLogEntry(event));
    await this.repository.upsert(entry);
    return entry;
  }

  async ingest(request: AuditLogIngestRequest): Promise<void> {
    const entries = request.items.map((entry) =>
      sanitizeEntry({
        ...entry,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }),
    );
    await this.repository.insertMany(entries);
  }

  async list(query: AuditLogListQuery): Promise<{ items: AuditLogEntry[]; nextCursor: string | null }> {
    const { items, nextCursor } = await this.repository.list(query);
    return {
      items: items.map((entry) => sanitizeEntry(entry)),
      nextCursor,
    };
  }
}
