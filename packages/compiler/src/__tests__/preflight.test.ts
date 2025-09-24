import { describe, expect, it } from 'vitest';
import type { DocumentModel, Snippet, SnippetVersion } from '@moduprompt/types';
import { runPreflight } from '../preflight';

const buildDocument = (): DocumentModel => ({
  id: 'doc-preflight',
  title: 'Preflight Demo',
  schemaVersion: 2,
  blocks: [
    {
      id: 'markdown-1',
      kind: 'markdown',
      sequence: 1,
      body: 'Hello {{unbound}}',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'snippet-block',
      kind: 'snippet',
      sequence: 2,
      snippetId: 'welcome',
      mode: 'transclude',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'markdown-2',
      kind: 'markdown',
      sequence: 3,
      body: '```md\ncode block\n```',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'snippet-block',
      target: 'markdown-1',
      kind: 'default',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'edge-2',
      source: 'markdown-1',
      target: 'snippet-block',
      kind: 'default',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  variables: [
    {
      id: 'variable-required',
      key: 'requiredVar',
      type: 'string',
      required: true,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  exportRecipes: [],
  tags: ['draft'],
  statusKey: 'draft',
  settings: { maxWidth: '80ch' },
  createdAt: 1,
  updatedAt: 1,
});

const snippetBundle = (): { snippet: Snippet; versions: SnippetVersion[] } => ({
  snippet: {
    id: 'welcome',
    title: 'Welcome Copy',
    path: 'system/welcome',
    frontmatter: { schemaVersion: 1 },
    body: 'Welcome!',
    headRev: 1,
    createdAt: 1,
    updatedAt: 1,
  },
  versions: [
    {
      snippetId: 'welcome',
      rev: 1,
      timestamp: 1,
      body: 'Welcome!',
      frontmatter: { schemaVersion: 1 },
      hash: 'sha256:welcome',
    },
  ],
});

describe('runPreflight', () => {
  it('detects missing variables, snippet cycles, and status gating', () => {
    const report = runPreflight({
      document: buildDocument(),
      snippets: [snippetBundle()],
      variables: {},
      allowedStatuses: ['ready'],
    });

    const codes = report.issues.map((issue) => issue.code);
    expect(codes).toContain('PREFLIGHT_STATUS_GATE');
    expect(codes).toContain('PREFLIGHT_VARIABLE_REQUIRED');
    expect(codes).toContain('PREFLIGHT_VARIABLE_UNBOUND');
    expect(codes).toContain('PREFLIGHT_GRAPH_CYCLE');

    // Ensure deterministic ordering by verifying sorted lexicographically.
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
    expect(report.summary.errors).toBeGreaterThanOrEqual(3);
  });

  it('flags missing snippet references in markdown transclusions', () => {
    const document = buildDocument();
    document.blocks = [
      {
        id: 'markdown-only',
        kind: 'markdown',
        sequence: 1,
        body: 'See {{> missing/path}}',
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    document.edges = [];

    const report = runPreflight({ document, snippets: [], variables: {} });
    expect(report.issues.find((issue) => issue.code === 'PREFLIGHT_TRANSCLUSION_MISSING')).toBeTruthy();
  });
});
