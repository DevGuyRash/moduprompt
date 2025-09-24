import { describe, it, expect, vi } from 'vitest';
import type { DocumentModel } from '@moduprompt/types';
import type { CompileResult } from '../src/types';
import { renderHtml } from '../src/server/export';

vi.mock('marked', () => ({
  marked: {
    parse: (input: string) => input,
  },
}));

const createDocument = (): DocumentModel => ({
  id: 'doc-1',
  title: 'Security Test Document',
  schemaVersion: 2,
  blocks: [],
  edges: [],
  variables: [],
  exportRecipes: [],
  tags: [],
  statusKey: 'draft',
  settings: { maxWidth: '80ch' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const createResult = (markdown: string): CompileResult => ({
  documentId: 'doc-1',
  markdown,
  text: markdown,
  hash: 'hash-123',
  provenance: [],
  diagnostics: [],
  preflight: {
    issues: [],
    summary: { errors: 0, warnings: 0 },
  },
});

describe('renderHtml sanitization', () => {
  it('strips disallowed scripts while preserving supported markdown elements', () => {
    const markdown = `<h1>Heading</h1><script>alert('xss')</script><a href="https://example.com" target="_blank">link</a><img src="data:image/png;base64,ZmFrZQ==" alt="fake" />`;
    const { html } = renderHtml({
      document: createDocument(),
      result: createResult(markdown),
    });

    expect(html).not.toContain('<script');
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('<img src="data:image/png;base64,ZmFrZQ==" alt="fake"');
  });
});
