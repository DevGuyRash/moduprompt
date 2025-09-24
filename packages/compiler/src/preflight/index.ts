import type {
  Block,
  DocumentModel,
  GroupBlock,
  MarkdownBlock,
  SnippetBlock,
} from '@moduprompt/types';
import {
  buildSnippetIndex,
  collectTransclusionTokens,
  resolveSnippetById,
  resolveSnippetByPath,
} from '../snippets';
import type {
  PreflightIssue,
  PreflightOptions,
  PreflightReport,
  SnippetBundle,
  SnippetIndex,
} from '../types';
import { collectPlaceholders, findUnbalancedFences } from '../utils/text';
import { resolveVariables } from '../variables';

const createIssue = (issue: PreflightIssue): PreflightIssue => issue;

const gatherMarkdownSources = (document: DocumentModel, snippetBundles?: SnippetBundle[]): string[] => {
  const sources: string[] = [];
  const blockById = new Map<string, Block>(document.blocks.map((block) => [block.id, block] as const));
  const visitBlock = (block: Block): void => {
    if (block.kind === 'markdown') {
      sources.push((block as MarkdownBlock).body);
      return;
    }
    if (block.kind === 'group') {
      const group = block as GroupBlock;
      for (const childId of group.children) {
        const child = blockById.get(childId);
        if (child) {
          visitBlock(child);
        }
      }
    }
  };
  for (const block of document.blocks) {
    visitBlock(block);
  }
  if (snippetBundles) {
    for (const bundle of snippetBundles) {
      for (const version of bundle.versions) {
        sources.push(version.body);
      }
    }
  }
  return sources;
};

const validateStatusGate = (
  document: DocumentModel,
  allowedStatuses?: string[],
): PreflightIssue[] => {
  if (!allowedStatuses || allowedStatuses.length === 0) {
    return [];
  }
  if (!allowedStatuses.includes(document.statusKey)) {
    return [
      createIssue({
        code: 'PREFLIGHT_STATUS_GATE',
        message: `Document status ${document.statusKey} is not allowed for export.`,
        severity: 'error',
        details: {
          allowedStatuses,
          statusKey: document.statusKey,
        },
      }),
    ];
  }
  return [];
};

const validateVariables = (
  document: DocumentModel,
  snippets: SnippetBundle[] | undefined,
  provided: Record<string, string>,
): PreflightIssue[] => {
  const issues: PreflightIssue[] = [];
  for (const variable of document.variables) {
    if (variable.required && !(variable.key in provided)) {
      issues.push(
        createIssue({
          code: 'PREFLIGHT_VARIABLE_REQUIRED',
          message: `Variable ${variable.key} is required but no value was provided.`,
          severity: 'error',
          path: `variables.${variable.key}`,
        }),
      );
    }
  }

  const sources = gatherMarkdownSources(document, snippets);
  const placeholders = new Set<string>();
  for (const source of sources) {
    for (const placeholder of collectPlaceholders(source)) {
      placeholders.add(placeholder);
    }
  }

  for (const placeholder of placeholders) {
    if (!(placeholder in provided)) {
      issues.push(
        createIssue({
          code: 'PREFLIGHT_VARIABLE_UNBOUND',
          message: `Placeholder {{${placeholder}}} does not have a bound value.`,
          severity: 'error',
        }),
      );
    }
  }

  return issues;
};

const ensureSnippetExists = (
  index: SnippetIndex,
  block: SnippetBlock,
): PreflightIssue[] => {
  const issues: PreflightIssue[] = [];
  const resolved = resolveSnippetById(index, block.snippetId, block.revision);
  if (!resolved) {
    issues.push(
      createIssue({
        code: 'PREFLIGHT_SNIPPET_MISSING',
        message: `Snippet ${block.snippetId}${block.revision != null ? `@${block.revision}` : ''} cannot be resolved.`,
        severity: 'error',
        path: `blocks.${block.id}`,
      }),
    );
  }
  return issues;
};

const buildSnippetDependencyGraph = (
  index: SnippetIndex,
  issues: PreflightIssue[],
): Map<string, Set<string>> => {
  const graph = new Map<string, Set<string>>();
  for (const [snippetId, entry] of index.byId.entries()) {
    const dependencies = new Set<string>();
    const headBody = entry.head?.body ?? '';
    for (const token of collectTransclusionTokens(headBody)) {
      const byId = index.byId.get(token.identifier)?.snippet.id;
      const byPath = index.byPath.get(token.identifier)?.snippet.id;
      const target = byId ?? byPath;
      if (target) {
        dependencies.add(target);
      } else {
        issues.push(
          createIssue({
            code: 'PREFLIGHT_SNIPPET_DEPENDENCY_MISSING',
            message: `Snippet ${snippetId} references unknown snippet ${token.identifier}.`,
            severity: 'error',
          }),
        );
      }
    }
    graph.set(snippetId, dependencies);
  }
  return graph;
};

const detectCycles = (graph: Map<string, Set<string>>): PreflightIssue[] => {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const issues: PreflightIssue[] = [];

  const visit = (node: string): void => {
    if (stack.has(node)) {
      issues.push(
        createIssue({
          code: 'PREFLIGHT_SNIPPET_CYCLE',
          message: `Detected snippet transclusion cycle involving ${node}.`,
          severity: 'error',
        }),
      );
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    stack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      visit(neighbor);
    }
    stack.delete(node);
  };

  for (const node of graph.keys()) {
    visit(node);
  }

  return issues;
};

const detectDocumentCycles = (document: DocumentModel): PreflightIssue[] => {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of document.edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set<string>());
    }
    adjacency.get(edge.source)?.add(edge.target);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const issues: PreflightIssue[] = [];

  const visit = (node: string): void => {
    if (visiting.has(node)) {
      issues.push(
        createIssue({
          code: 'PREFLIGHT_GRAPH_CYCLE',
          message: `Detected document graph cycle involving block ${node}.`,
          severity: 'error',
        }),
      );
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visiting.add(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      visit(neighbor);
    }
    visiting.delete(node);
    visited.add(node);
  };

  for (const block of document.blocks) {
    visit(block.id);
  }

  return issues;
};

const validateFences = (
  document: DocumentModel,
  snippets?: SnippetBundle[],
): PreflightIssue[] => {
  const issues: PreflightIssue[] = [];
  const sources = gatherMarkdownSources(document, snippets);
  sources.forEach((source, index) => {
    const problems = findUnbalancedFences(source);
    for (const problem of problems) {
      issues.push(
        createIssue({
          code: 'PREFLIGHT_FENCE_UNBALANCED',
          message: `Unbalanced code fence ${problem.fence} detected (line ${problem.line}).`,
          severity: 'error',
          path: `markdown[${index}]`,
        }),
      );
    }
  });
  return issues;
};

const validateMarkdownTransclusions = (document: DocumentModel, index: SnippetIndex): PreflightIssue[] => {
  const issues: PreflightIssue[] = [];
  for (const block of document.blocks) {
    if (block.kind !== 'markdown') {
      continue;
    }
    for (const token of collectTransclusionTokens((block as MarkdownBlock).body)) {
      const exists = index.byId.has(token.identifier) || index.byPath.has(token.identifier);
      if (!exists) {
        issues.push(
          createIssue({
            code: 'PREFLIGHT_TRANSCLUSION_MISSING',
            message: `Transclusion target ${token.identifier} not found.`,
            severity: 'error',
          }),
        );
      }
    }
  }
  return issues;
};

export const runPreflight = (options: PreflightOptions): PreflightReport => {
  const snippetBundles = options.snippets ?? [];
  const index = buildSnippetIndex(snippetBundles);
  const { values: resolvedVariables } = resolveVariables(options.document, options.variables);
  const issues: PreflightIssue[] = [];

  issues.push(...validateStatusGate(options.document, options.allowedStatuses));
  issues.push(...validateVariables(options.document, snippetBundles, resolvedVariables));

  for (const block of options.document.blocks) {
    if (block.kind === 'snippet') {
      issues.push(...ensureSnippetExists(index, block as SnippetBlock));
    }
  }

  issues.push(...detectDocumentCycles(options.document));
  issues.push(...validateFences(options.document, snippetBundles));
  issues.push(...validateMarkdownTransclusions(options.document, index));
  issues.push(...detectCycles(buildSnippetDependencyGraph(index, issues)));

  issues.sort((a, b) => a.code.localeCompare(b.code));
  const summary = issues.reduce(
    (acc, issue) => {
      if (issue.severity === 'error') {
        acc.errors += 1;
      } else {
        acc.warnings += 1;
      }
      return acc;
    },
    { errors: 0, warnings: 0 },
  );

  return {
    issues,
    summary,
  } satisfies PreflightReport;
};
