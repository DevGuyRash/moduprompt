import { describe, expect, it } from 'vitest';
import type { DocumentModel, Snippet, SnippetVersion, VariableDefinition } from '@moduprompt/types';
import { compileDocument } from '../index.js';

const baseVariables: VariableDefinition[] = [
  {
    id: 'var-1',
    key: 'product',
    label: 'Product Name',
    type: 'string',
    required: true,
  },
];

const buildSnippetBundle = () => {
  const snippet: Snippet = {
    id: 'snippet-hero',
    title: 'Hero Message',
    path: 'marketing/hero',
    frontmatter: {
      schemaVersion: 1,
      tags: ['release'],
    },
    body: '{{product}} launches today!',
    headRev: 2,
    createdAt: 1,
    updatedAt: 2,
  };

  const versions: SnippetVersion[] = [
    {
      snippetId: snippet.id,
      rev: 1,
      parentRev: undefined,
      timestamp: 1,
      body: 'Legacy',
      frontmatter: {
        schemaVersion: 1,
        tags: ['legacy'],
      },
      hash: 'sha256:legacy',
    },
    {
      snippetId: snippet.id,
      rev: 2,
      parentRev: 1,
      timestamp: 2,
      body: '{{product}} launches today!',
      frontmatter: snippet.frontmatter,
      hash: 'sha256:v2',
    },
  ];

  return { snippet, versions };
};

const buildDocument = (overrides?: Partial<DocumentModel>): DocumentModel => ({
  id: 'doc-1',
  title: 'Launch Plan',
  schemaVersion: 2,
  blocks: [
    {
      id: 'markdown-1',
      kind: 'markdown',
      sequence: 1,
      body: '# Launch Update\n{{> marketing/hero}}',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'snippet-1',
      kind: 'snippet',
      sequence: 2,
      snippetId: 'snippet-hero',
      mode: 'transclude',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'divider-1',
      kind: 'divider',
      sequence: 3,
      style: 'line',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  edges: [],
  variables: baseVariables,
  exportRecipes: [],
  tags: ['draft'],
  statusKey: 'ready',
  settings: { maxWidth: '96ch' },
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
});

describe('compileDocument', () => {
  it('produces deterministic output and provenance for snippet transclusions', () => {
    const document = buildDocument();
    const snippets = [buildSnippetBundle()];
    const compile = () =>
      compileDocument({
        document,
        snippets,
        variables: { product: 'ModuPrompt' },
        allowedStatuses: ['ready'],
      });

    const first = compile();
    const second = compile();

    expect(first.hash).toBe(second.hash);
    expect(first.markdown).toBe(second.markdown);
    expect(first.markdown).toContain('# Launch Update');
    expect(first.markdown).toContain('ModuPrompt launches today!');
    expect(first.provenance).toEqual([
      {
        snippetId: 'snippet-hero',
        revision: 2,
        hash: 'sha256:v2',
        mode: 'transclude',
        path: 'marketing/hero',
      },
    ]);
    expect(first.preflight.summary.errors).toBe(0);
    expect(first.diagnostics).toHaveLength(0);
  });

  it('reports missing snippets without compromising determinism', () => {
    const document = buildDocument({
      blocks: [
        {
          id: 'only-snippet',
          kind: 'snippet',
          sequence: 1,
          snippetId: 'missing-snippet',
          revision: 7,
          mode: 'transclude',
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      statusKey: 'ready',
    });

    const result = compileDocument({
      document,
      snippets: [],
      variables: {},
      allowedStatuses: ['ready'],
    });

    expect(result.markdown).toContain('{{missing:missing-snippet}}');
    expect(result.provenance).toEqual([]);
    expect(result.diagnostics.find((issue) => issue.code === 'COMPILER_SNIPPET_NOT_FOUND')).toBeTruthy();
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/i);
  });

  it('enforces status gating via preflight checks', () => {
    const document = buildDocument({ statusKey: 'draft' });
    const snippets = [buildSnippetBundle()];

    const result = compileDocument({
      document,
      snippets,
      variables: { product: 'ModuPrompt' },
      allowedStatuses: ['ready'],
    });

    const gate = result.preflight.issues.find((issue) => issue.code === 'PREFLIGHT_STATUS_GATE');
    expect(gate).toBeTruthy();
    expect(gate?.details).toMatchObject({ allowedStatuses: ['ready'], statusKey: 'draft' });
    expect(result.preflight.summary.errors).toBeGreaterThanOrEqual(1);
  });
});
