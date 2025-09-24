import { beforeAll, bench, describe } from 'vitest';
import type { DocumentModel, Snippet, SnippetVersion, VariableDefinition } from '@moduprompt/types';
import { compileDocument } from '../../packages/compiler/src/index';

interface CompilerDataset {
  document: DocumentModel;
  snippets: Array<{ snippet: Snippet; versions: SnippetVersion[] }>;
  variables: Record<string, string>;
}

const createDataset = (blockCount = 2000, snippetCount = 500): CompilerDataset => {
  const variables: VariableDefinition[] = [
    {
      id: 'var-product',
      key: 'product',
      type: 'string',
      required: true,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'var-version',
      key: 'releaseVersion',
      type: 'string',
      required: true,
      createdAt: 1,
      updatedAt: 1,
    },
  ];

  const snippets = Array.from({ length: snippetCount }, (_, index) => {
    const snippet: Snippet = {
      id: `snippet-${index}`,
      title: `Reusable snippet ${index}`,
      path: `library/${index}`,
      frontmatter: { schemaVersion: 1, tags: ['perf'] },
      body: `Content for snippet ${index}`,
      headRev: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    const versions: SnippetVersion[] = [
      {
        snippetId: snippet.id,
        rev: 1,
        timestamp: 1,
        body: `Snippet ${index} references {{product}} v{{releaseVersion}}`,
        frontmatter: { schemaVersion: 1, tags: ['perf'] },
        hash: `sha256:snippet-${index}`,
      },
    ];

    return { snippet, versions };
  });

  const blocks: DocumentModel['blocks'] = [];
  for (let i = 0; i < blockCount; i += 1) {
    const sequence = i + 1;
    if (i % 4 === 0) {
      blocks.push({
        id: `snippet-block-${i}`,
        kind: 'snippet',
        snippetId: `snippet-${i % snippetCount}`,
        mode: 'transclude',
        sequence,
        createdAt: 1,
        updatedAt: 1,
      });
    } else {
      blocks.push({
        id: `markdown-block-${i}`,
        kind: 'markdown',
        body: `### Block ${i}\n- Product: {{product}}\n- Release: {{releaseVersion}}`,
        sequence,
        createdAt: 1,
        updatedAt: 1,
      });
    }
  }

  const document: DocumentModel = {
    id: 'perf-doc',
    title: 'Performance Harness',
    schemaVersion: 2,
    blocks,
    edges: [],
    variables,
    exportRecipes: [],
    tags: ['ready'],
    statusKey: 'ready',
    settings: { maxWidth: '96ch' },
    createdAt: 1,
    updatedAt: 1,
  };

  return {
    document,
    snippets,
    variables: {
      product: 'ModuPrompt',
      releaseVersion: '2025.09',
    },
  } satisfies CompilerDataset;
};

let dataset: CompilerDataset;
let baselineHash: string;

beforeAll(() => {
  dataset = createDataset();
  const baseline = compileDocument({
    document: dataset.document,
    snippets: dataset.snippets,
    variables: dataset.variables,
    allowedStatuses: ['ready'],
  });
  baselineHash = baseline.hash;
});

describe('compiler throughput', () => {
  bench(
    'compile 2k-block document with governed snippets',
    () => {
      const result = compileDocument({
        document: dataset.document,
        snippets: dataset.snippets,
        variables: dataset.variables,
        allowedStatuses: ['ready'],
      });
      if (result.hash !== baselineHash) {
        throw new Error(`Non-deterministic hash detected: ${result.hash}`);
      }
    },
    { time: 1_000, iterations: 5 },
  );
});
