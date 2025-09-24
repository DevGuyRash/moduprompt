import {
  collectTransclusionTokens,
  resolveSnippetById,
  resolveSnippetByPath,
} from '../snippets.js';
import type { CompilerDiagnostic, ProvenanceEntry, SnippetIndex } from '../types.js';

interface ApplyTransclusionOptions {
  index: SnippetIndex;
  provenance: Map<string, ProvenanceEntry>;
  diagnostics: CompilerDiagnostic[];
  stack?: string[];
}

const isSnippetId = (identifier: string, index: SnippetIndex): boolean => index.byId.has(identifier);

const provenanceKey = (entry: ProvenanceEntry): string => `${entry.snippetId}@${entry.revision}:${entry.mode}`;

const addProvenance = (map: Map<string, ProvenanceEntry>, entry: ProvenanceEntry): void => {
  const key = provenanceKey(entry);
  if (!map.has(key)) {
    map.set(key, entry);
  }
};

const applyToken = (
  source: string,
  token: ReturnType<typeof collectTransclusionTokens>[number],
  options: ApplyTransclusionOptions,
): string => {
  const { index, provenance, diagnostics } = options;
  const stack = options.stack ?? [];
  const identifier = token.identifier;
  const nextStack = [...stack];
  const resolver = isSnippetId(identifier, index) ? resolveSnippetById : resolveSnippetByPath;
  const resolved = resolver(index, identifier, token.revision);
  if (!resolved) {
    diagnostics.push({
      code: 'COMPILER_SNIPPET_NOT_FOUND',
      message: `Unable to resolve snippet ${identifier}${token.revision != null ? `@${token.revision}` : ''}.`,
      severity: 'error',
    });
    return source;
  }
  if (stack.includes(resolved.snippet.id)) {
    diagnostics.push({
      code: 'COMPILER_SNIPPET_CYCLE',
      message: `Detected cyclic transclusion involving snippet ${resolved.snippet.id}.`,
      severity: 'error',
    });
    return source;
  }
  nextStack.push(resolved.snippet.id);
  addProvenance(provenance, {
    snippetId: resolved.snippet.id,
    revision: resolved.version.rev,
    hash: resolved.version.hash,
    mode: 'transclude',
    path: resolved.snippet.path,
  });
  const nested = applyTransclusionsInternal(resolved.body, {
    ...options,
    stack: nextStack,
  });
  return source.replace(token.raw, nested);
};

const applyTransclusionsInternal = (input: string, options: ApplyTransclusionOptions): string => {
  const tokens = collectTransclusionTokens(input);
  let output = input;
  for (const token of tokens) {
    output = applyToken(output, token, options);
  }
  return output;
};

export const applyTransclusions = (
  input: string,
  options: ApplyTransclusionOptions,
): { result: string; diagnostics: CompilerDiagnostic[] } => {
  const result = applyTransclusionsInternal(input, options);
  return { result, diagnostics: options.diagnostics };
};
