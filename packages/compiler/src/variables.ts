import type { DocumentModel, VariableDefinition } from '@moduprompt/types';

export interface VariableResolution {
  values: Record<string, string>;
  missing: string[];
}

const toStringValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

export const resolveVariables = (
  document: DocumentModel,
  provided?: Record<string, string | number | boolean | null>,
): VariableResolution => {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  const providedEntries = Object.entries(provided ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value != null) {
      acc[key] = toStringValue(value);
    }
    return acc;
  }, {});

  for (const definition of document.variables as VariableDefinition[]) {
    const key = definition.key;
    if (providedEntries[key] != null) {
      values[key] = providedEntries[key];
      continue;
    }
    if (definition.defaultValue != null) {
      values[key] = toStringValue(definition.defaultValue);
      continue;
    }
    if (definition.required) {
      missing.push(key);
    }
  }

  for (const [key, value] of Object.entries(providedEntries)) {
    if (!(key in values)) {
      values[key] = value;
    }
  }

  return { values, missing } satisfies VariableResolution;
};
