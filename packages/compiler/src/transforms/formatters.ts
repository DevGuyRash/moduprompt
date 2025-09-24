import type { Block } from '@moduprompt/types';
import type {
  CompilerDiagnostic,
  FilterDefinition,
  FilterFn,
  FilterContext,
  FormatterDefinition,
  FormatterFn,
  FormatterContext,
} from '../types';

const toMap = <T extends { id: string }>(definitions?: T[]): Map<string, T> => {
  const map = new Map<string, T>();
  for (const definition of definitions ?? []) {
    if (!map.has(definition.id)) {
      map.set(definition.id, definition);
    }
  }
  return map;
};

interface FormatterPipelineOptions {
  block: Block;
  documentContext: FormatterContext;
  definitions?: FormatterDefinition[];
  diagnostics: CompilerDiagnostic[];
}

const getFormatterIds = (block: Block): string[] => {
  const metadata = (block as Block & { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }
  const formatters = (metadata as { formatters?: unknown }).formatters;
  if (!Array.isArray(formatters)) {
    return [];
  }
  return formatters
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id === 'string') {
        return (item as { id: string }).id;
      }
      return undefined;
    })
    .filter((value): value is string => typeof value === 'string');
};

export const applyFormatters = (
  content: string,
  options: FormatterPipelineOptions,
): string => {
  const registry = toMap(options.definitions);
  let output = content;
  for (const formatterId of getFormatterIds(options.block)) {
    const formatter = registry.get(formatterId);
    if (!formatter) {
      options.diagnostics.push({
        code: 'COMPILER_FORMATTER_MISSING',
        message: `Formatter ${formatterId} is not registered.`,
        severity: 'warning',
      });
      continue;
    }
    output = formatter.apply(output, options.documentContext);
  }
  return output;
};

interface FilterPipelineOptions {
  content: string;
  context: FilterContext;
  filters?: FilterDefinition[];
}

export const applyFilters = (options: FilterPipelineOptions): string => {
  const registry = toMap(options.filters);
  const ordered = Array.from(registry.values()).sort((a, b) => a.id.localeCompare(b.id));
  let result = options.content;
  for (const filter of ordered) {
    result = filter.apply(result, options.context);
  }
  return result;
};
