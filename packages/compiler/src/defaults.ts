import type { Block } from '@moduprompt/types';
import { wrapWithSmartFence } from './utils/backticks.js';
import { normalizeNewlines } from './utils/text.js';
import type { FilterDefinition, FormatterDefinition, FormatterContext } from './types.js';

const getMetadata = (block: Block): Record<string, unknown> => {
  const metadata = (block as Block & { metadata?: unknown }).metadata;
  return metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
};

const getFormatterOption = <T>(context: FormatterContext, key: string): T | undefined => {
  const metadata = getMetadata(context.block);
  const options = metadata.formatterOptions;
  if (options && typeof options === 'object' && key in (options as Record<string, unknown>)) {
    return (options as Record<string, T>)[key];
  }
  return undefined;
};

export const createDefaultFormatters = (): FormatterDefinition[] => {
  const codeFormatter: FormatterDefinition = {
    id: 'code',
    apply: (input, context) => {
      const language = getFormatterOption<{ language?: string }>(context, 'code')?.language;
      const hintedLanguage =
        (getMetadata(context.block).language as string | undefined) ?? language ?? undefined;
      return wrapWithSmartFence(normalizeNewlines(input), hintedLanguage);
    },
    description: 'Wrap content in a deterministic fenced code block.',
  };

  const xmlFormatter: FormatterDefinition = {
    id: 'xml',
    apply: (input) => wrapWithSmartFence(normalizeNewlines(input), 'xml'),
    description: 'Render content as XML fenced code.',
  };

  const blockquoteFormatter: FormatterDefinition = {
    id: 'blockquote',
    apply: (input) => normalizeNewlines(input)
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n'),
    description: 'Render content as a Markdown blockquote.',
  };

  const calloutFormatter: FormatterDefinition = {
    id: 'callout',
    apply: (input, context) => {
      const options = getFormatterOption<{ title?: string; icon?: string }>(context, 'callout') ?? {};
      const icon = options.icon ?? 'i';
      const title = options.title ?? 'Note';
      const lines = normalizeNewlines(input)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return `> ${icon} **${title}**\n${lines}`;
    },
    description: 'Render content as an emphasized callout block.',
  };

  return [codeFormatter, xmlFormatter, blockquoteFormatter, calloutFormatter];
};

export const createDefaultFilters = (): FilterDefinition[] => {
  const canonicalWhitespace: FilterDefinition = {
    id: 'canonical-whitespace',
    description: 'Ensure no trailing spaces and collapse triple blank lines for deterministic output.',
    apply: (input) => {
      const lines = normalizeNewlines(input)
        .split('\n')
        .map((line) => line.trimEnd());
      const result: string[] = [];
      let blankCount = 0;
      for (const line of lines) {
        if (line.length === 0) {
          blankCount += 1;
        } else {
          blankCount = 0;
        }
        if (blankCount <= 2) {
          result.push(line);
        }
      }
      return result.join('\n');
    },
  } satisfies FilterDefinition;

  return [canonicalWhitespace];
};
