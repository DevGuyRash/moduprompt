import type {
  Block,
  DocumentModel,
  MarkdownBlock,
  SnippetBlock,
} from '@moduprompt/types';
import { buildSnippetIndex, resolveSnippetById, resolveSnippetByPath } from './snippets.js';
import { applyTransclusions } from './transforms/transclusion.js';
import { substituteVariables } from './transforms/substitution.js';
import { applyFilters, applyFormatters } from './transforms/formatters.js';
import { computeHash } from './utils/hash.js';
import {
  ensureTerminalNewline,
  markdownToText,
  normalizeNewlines,
  trimTrailingWhitespace,
} from './utils/text.js';
import { resolveVariables } from './variables.js';
import { runPreflight } from './preflight/index.js';
import { createDefaultFilters, createDefaultFormatters } from './defaults.js';
import type {
  CompileOptions,
  CompileResult,
  CompilerDiagnostic,
  FormatterContext,
  ProvenanceEntry,
  SnippetIndex,
} from './types.js';

const sortBlocks = (blocks: Block[]): Block[] => {
  return [...blocks].sort((a, b) => {
    if (a.sequence !== b.sequence) {
      return a.sequence - b.sequence;
    }
    return a.id.localeCompare(b.id);
  });
};

const addProvenance = (map: Map<string, ProvenanceEntry>, entry: ProvenanceEntry): void => {
  const key = `${entry.snippetId}@${entry.revision}:${entry.mode}`;
  if (!map.has(key)) {
    map.set(key, entry);
  }
};

const resolveSnippetContent = (
  block: SnippetBlock,
  index: SnippetIndex,
  diagnostics: CompilerDiagnostic[],
): { content: string; entry?: ProvenanceEntry } => {
  const resolved = resolveSnippetById(index, block.snippetId, block.revision);
  if (!resolved) {
    diagnostics.push({
      code: 'COMPILER_SNIPPET_NOT_FOUND',
      message: `Unable to resolve snippet ${block.snippetId}${block.revision != null ? `@${block.revision}` : ''}.`,
      severity: 'error',
      path: `blocks.${block.id}`,
    });
    return { content: `{{missing:${block.snippetId}}}` };
  }
  const entry: ProvenanceEntry = {
    snippetId: resolved.snippet.id,
    revision: resolved.version.rev,
    hash: resolved.version.hash,
    mode: block.mode,
    path: resolved.snippet.path,
  };
  return { content: resolved.body, entry };
};

const compileMarkdown = (
  block: MarkdownBlock,
  options: {
    index: SnippetIndex;
    provenance: Map<string, ProvenanceEntry>;
    diagnostics: CompilerDiagnostic[];
    formatterContext: FormatterContext;
    formatters?: CompileOptions['formatters'];
  },
  variables: Record<string, string>,
): string => {
  const { diagnostics, index, formatterContext, provenance } = options;
  const transclusionResult = applyTransclusions(block.body, {
    index,
    provenance,
    diagnostics,
  });
  const substitution = substituteVariables(normalizeNewlines(transclusionResult.result), variables);
  for (const missing of substitution.missing) {
    diagnostics.push({
      code: 'COMPILER_VARIABLE_UNBOUND',
      message: `Variable ${missing} is not bound.`,
      severity: 'error',
    });
  }
  const formatted = applyFormatters(substitution.result, {
    block,
    documentContext: formatterContext,
    definitions: options.formatters,
    diagnostics,
  });
  return trimTrailingWhitespace(normalizeNewlines(formatted));
};

const compileSnippetBlock = (
  block: SnippetBlock,
  options: {
    index: SnippetIndex;
    provenance: Map<string, ProvenanceEntry>;
    diagnostics: CompilerDiagnostic[];
    formatterContext: FormatterContext;
    formatters?: CompileOptions['formatters'];
  },
  variables: Record<string, string>,
): string => {
  const { diagnostics, index, provenance, formatterContext } = options;
  const resolved = resolveSnippetContent(block, index, diagnostics);
  if (resolved.entry) {
    addProvenance(provenance, resolved.entry);
  }
  const transclusion = applyTransclusions(resolved.content, {
    index,
    provenance,
    diagnostics,
    stack: resolved.entry ? [resolved.entry.snippetId] : undefined,
  });
  const substitution = substituteVariables(normalizeNewlines(transclusion.result), variables);
  for (const missing of substitution.missing) {
    diagnostics.push({
      code: 'COMPILER_VARIABLE_UNBOUND',
      message: `Variable ${missing} is not bound in snippet ${block.snippetId}.`,
      severity: 'error',
    });
  }
  const formatted = applyFormatters(substitution.result, {
    block,
    documentContext: formatterContext,
    definitions: options.formatters,
    diagnostics,
  });
  return trimTrailingWhitespace(normalizeNewlines(formatted));
};

const compileDivider = (): string => '---';

const compileBlock = (
  block: Block,
  context: {
    index: SnippetIndex;
    provenance: Map<string, ProvenanceEntry>;
    diagnostics: CompilerDiagnostic[];
    formatterContext: FormatterContext;
    includeComments: boolean;
    formatters?: CompileOptions['formatters'];
  },
  variables: Record<string, string>,
): string | null => {
  switch (block.kind) {
    case 'markdown':
      return compileMarkdown(block as MarkdownBlock, context, variables);
    case 'snippet':
      return compileSnippetBlock(block as SnippetBlock, context, variables);
    case 'divider':
      return compileDivider();
    case 'comment':
      return context.includeComments ? (block as Block & { body?: string }).body ?? '' : null;
    case 'group':
    default:
      return null;
  }
};

export const compileDocument = (options: CompileOptions): CompileResult => {
  const newline = options.newline ?? '\n';
  const includeComments = options.includeComments ?? false;
  const index = buildSnippetIndex(options.snippets);
  const diagnostics: CompilerDiagnostic[] = [];
  const provenance = new Map<string, ProvenanceEntry>();
  const resolvedVariables = resolveVariables(options.document, options.variables);
  const formatters = options.formatters ?? createDefaultFormatters();
  const filters = options.filters ?? createDefaultFilters();
  const fallbackBlock: MarkdownBlock = {
    id: '__formatter_placeholder__',
    kind: 'markdown',
    sequence: 0,
    body: '',
    createdAt: 0,
    updatedAt: 0,
  } satisfies MarkdownBlock;
  const formatterContext: FormatterContext = {
    document: options.document,
    block: (options.document.blocks[0] as Block | undefined) ?? fallbackBlock,
    variables: resolvedVariables.values,
  };

  const preflight = runPreflight({
    document: options.document,
    snippets: options.snippets,
    variables: resolvedVariables.values,
    allowedStatuses: options.allowedStatuses,
  });

  const compiledBlocks: string[] = [];
  for (const block of sortBlocks(options.document.blocks)) {
    formatterContext.block = block;
    const compiled = compileBlock(
      block,
      {
        index,
        provenance,
        diagnostics,
        formatterContext,
        includeComments,
        formatters,
      },
      resolvedVariables.values,
    );
    if (compiled != null && compiled.length > 0) {
      compiledBlocks.push(compiled);
    }
  }

  const joined = compiledBlocks.join(`\n\n`);
  const normalized = ensureTerminalNewline(trimTrailingWhitespace(normalizeNewlines(joined)), newline);
  const filtered = applyFilters({
    content: normalized,
    context: { document: options.document, variables: resolvedVariables.values },
    filters,
  });
  const markdown = ensureTerminalNewline(filtered, newline);
  const text = markdownToText(markdown);
  const hash = computeHash(markdown);
  const provenanceEntries = Array.from(provenance.values()).sort((a, b) => {
    if (a.snippetId === b.snippetId) {
      return a.revision - b.revision;
    }
    return a.snippetId.localeCompare(b.snippetId);
  });

  return {
    documentId: options.document.id,
    markdown,
    text,
    hash,
    provenance: provenanceEntries,
    diagnostics,
    preflight,
  } satisfies CompileResult;
};
