import { describe, expect, it } from 'vitest';
import { CompilerWorkerBridge } from '../compilerBridge.js';
import { compileDocument, type CompileResult } from '@moduprompt/compiler';
import type { DocumentModel, SnippetBundle } from '@moduprompt/types';

const createDocument = (): DocumentModel => ({
  id: 'doc-1',
  schemaVersion: 2,
  title: 'Test Document',
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

const emptyBundles: SnippetBundle[] = [];

describe('CompilerWorkerBridge', () => {
  it('falls back to direct compilation when Worker is unavailable', async () => {
    const bridge = new CompilerWorkerBridge();
    const payload = {
      document: createDocument(),
      snippets: emptyBundles,
      variables: {},
      allowedStatuses: undefined,
    } as const;

    const expected: CompileResult = compileDocument(payload);
    const result = await bridge.compile(payload);

    expect(result).toEqual(expected);
  });
});
