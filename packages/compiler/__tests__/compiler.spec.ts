import type {
  DocumentModel,
  MarkdownBlock,
  Snippet,
  SnippetBlock,
  SnippetVersion,
  VariableDefinition,
} from '@moduprompt/types';
import { describe, expect, it } from 'vitest';
import {
  compileDocument,
  compileWithWorker,
  registerCompilerWorker,
  runPreflight,
  type SnippetBundle,
  type WorkerCompileFailure,
  type WorkerCompileRequest,
  type WorkerCompileSuccess,
  type WorkerLike,
} from '../src/index.js';

const now = 1_701_000_000;

const createDocument = (overrides?: Partial<DocumentModel>): DocumentModel => {
  const markdown: MarkdownBlock = {
    id: 'markdown-1',
    kind: 'markdown',
    sequence: 1,
    body: 'Intro {{greeting}}\n{{> alpha}}',
    createdAt: now,
    updatedAt: now,
  } satisfies MarkdownBlock;
  const snippetBlock: SnippetBlock = {
    id: 'snippet-1',
    kind: 'snippet',
    sequence: 2,
    snippetId: 'alpha',
    revision: 1,
    mode: 'transclude',
    createdAt: now,
    updatedAt: now,
  } satisfies SnippetBlock;
  const variable: VariableDefinition = {
    id: 'var-greeting',
    key: 'greeting',
    type: 'string',
    required: true,
  } satisfies VariableDefinition;
  const base: DocumentModel = {
    id: 'doc-1',
    schemaVersion: 2,
    title: 'Demo',
    blocks: [markdown, snippetBlock],
    edges: [],
    variables: [variable],
    exportRecipes: [],
    tags: [],
    statusKey: 'approved',
    settings: { maxWidth: '80ch' },
    createdAt: now,
    updatedAt: now,
  } satisfies DocumentModel;
  return { ...base, ...overrides } satisfies DocumentModel;
};

const createSnippets = (): SnippetBundle[] => {
  const snippet: Snippet = {
    id: 'alpha',
    title: 'Alpha',
    path: 'alpha',
    frontmatter: { schemaVersion: 1 },
    body: 'Alpha body',
    headRev: 1,
    createdAt: now,
    updatedAt: now,
  } satisfies Snippet;
  const version: SnippetVersion = {
    snippetId: 'alpha',
    rev: 1,
    parentRev: undefined,
    author: undefined,
    note: undefined,
    timestamp: now,
    body: 'Alpha body content {{greeting}}',
    frontmatter: { schemaVersion: 1 },
    hash: 'hash-alpha-1',
  } satisfies SnippetVersion;
  return [
    {
      snippet,
      versions: [version],
    },
  ];
};

describe('compileDocument', () => {
  it('produces deterministic markdown, text, and provenance', () => {
    const document = createDocument();
    const snippets = createSnippets();
    const result = compileDocument({
      document,
      snippets,
      variables: { greeting: 'Hello' },
      allowedStatuses: ['approved'],
    });

    expect(result.markdown).toBe('Intro Hello\nAlpha body content Hello\n\nAlpha body content Hello\n');
    expect(result.text).toBe('Intro Hello Alpha body content Hello Alpha body content Hello');
    expect(result.provenance).toEqual([
      {
        snippetId: 'alpha',
        revision: 1,
        hash: 'hash-alpha-1',
        mode: 'transclude',
        path: 'alpha',
      },
    ]);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.preflight.summary.errors).toBe(0);
    expect(result.hash).toBe(compileDocument({
      document,
      snippets,
      variables: { greeting: 'Hello' },
      allowedStatuses: ['approved'],
    }).hash);
  });

  it('flags inline provenance separately', () => {
    const document = createDocument({
      blocks: [
        {
          id: 'snippet-inline',
          kind: 'snippet',
          sequence: 1,
          snippetId: 'alpha',
          mode: 'inline',
          createdAt: now,
          updatedAt: now,
        } as SnippetBlock,
      ],
    });
    const snippets = createSnippets();
    const result = compileDocument({ document, snippets, variables: { greeting: 'Hi' } });
    expect(result.provenance[0]?.mode).toBe('inline');
  });
});

describe('runPreflight', () => {
  it('detects status gate violation and variable issues', () => {
    const document = createDocument({ statusKey: 'draft' });
    const report = runPreflight({
      document,
      snippets: createSnippets(),
      allowedStatuses: ['approved'],
      variables: {},
    });
    const codes = report.issues.map((issue) => issue.code).sort();
    expect(codes).toContain('PREFLIGHT_STATUS_GATE');
    expect(codes).toContain('PREFLIGHT_VARIABLE_REQUIRED');
  });

  it('detects snippet cycles and missing dependencies', () => {
    const snippets = createSnippets();
    snippets[0]?.versions.push({
      ...snippets[0]!.versions[0]!,
      rev: 2,
      body: 'Referencing {{> missing}}',
      hash: 'hash-alpha-2',
    });
    snippets[0]!.snippet.headRev = 2;
    const document = createDocument();
    const report = runPreflight({ document, snippets });
    const codes = report.issues.map((issue) => issue.code);
    expect(codes).toContain('PREFLIGHT_SNIPPET_DEPENDENCY_MISSING');
  });

  it('detects graph cycles', () => {
    const document = createDocument({
      edges: [
        { id: 'edge-1', source: 'markdown-1', target: 'snippet-1', kind: 'default', createdAt: now, updatedAt: now },
        { id: 'edge-2', source: 'snippet-1', target: 'markdown-1', kind: 'default', createdAt: now, updatedAt: now },
      ],
    });
    const report = runPreflight({ document, snippets: createSnippets() });
    expect(report.issues.some((issue) => issue.code === 'PREFLIGHT_GRAPH_CYCLE')).toBe(true);
  });
});

type MessageEventLike<T> = { data: T };

describe('worker integration', () => {
  it('compiles via worker bridge', async () => {
    const listeners = new Set<(event: MessageEventLike<WorkerCompileRequest | WorkerCompileFailure | WorkerCompileSuccess>) => void>();
    const scope = {
      postMessage: (message: WorkerCompileFailure | WorkerCompileSuccess) => {
        listeners.forEach((listener) => listener({ data: message }));
      },
      addEventListener: (
        _event: 'message',
        listener: (event: MessageEventLike<WorkerCompileRequest | WorkerCompileFailure | WorkerCompileSuccess>) => void,
      ) => {
        listeners.add(listener);
      },
    };

    registerCompilerWorker({ scope: scope as unknown as Parameters<typeof registerCompilerWorker>[0]['scope'] });

    const worker: WorkerLike = {
      postMessage: (message) => {
        listeners.forEach((listener) => listener({ data: message }));
      },
      addEventListener: (_event, listener) => {
        listeners.add(listener);
      },
      removeEventListener: (_event, listener) => {
        listeners.delete(listener);
      },
    };

    const result = await compileWithWorker(worker, {
      document: createDocument(),
      snippets: createSnippets(),
      variables: { greeting: 'Hello' },
    });

    expect(result.markdown.includes('Intro Hello')).toBe(true);
  });
});
