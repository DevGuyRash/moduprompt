import type { AuditLogEntry, JsonObject, JsonValue } from '@moduprompt/types';

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

const sanitizePrimitive = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > MAX_STRING_LENGTH) {
      return `${normalized.slice(0, MAX_STRING_LENGTH - 1)}…`;
    }
    return normalized;
  }
  return String(value);
};

export const sanitizeValue = (value: unknown, depth = 0): JsonValue => {
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
  return sanitizePrimitive(value);
};

export const sanitizeAuditEntry = (entry: AuditLogEntry): AuditLogEntry => ({
  ...entry,
  metadata: sanitizeObject(entry.metadata, 0),
});
