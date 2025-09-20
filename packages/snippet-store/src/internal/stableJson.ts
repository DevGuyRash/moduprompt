import type { JsonObject, JsonValue } from '@moduprompt/types';

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item as JsonValue));
  }

  if (isObject(value)) {
    const sortedEntries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    const normalized: JsonObject = {};
    for (const [key, val] of sortedEntries) {
      normalized[key] = normalizeValue(val as JsonValue);
    }
    return normalized;
  }

  return value;
};

export const stableStringify = (value: JsonValue): string => {
  const normalized = normalizeValue(value);
  return JSON.stringify(normalized);
};
