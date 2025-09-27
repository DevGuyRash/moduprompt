import type {
  DocumentModel,
  MarkdownBlock,
  SnippetBlock,
  CommentBlock,
  Edge,
  VariableDefinition,
  Snippet,
  SnippetVersion,
} from '@moduprompt/types';
import { computeIntegrityHash, type WorkspaceStore } from '@moduprompt/snippet-store';

export const DEMO_DOCUMENT_ID = 'moduprompt-welcome';
const DEMO_SNIPPET_ID = 'snippet-greeting';

const createMarkdownBlock = (id: string, sequence: number, body: string): MarkdownBlock => {
  const timestamp = Date.now();
  return {
    id,
    kind: 'markdown',
    sequence,
    body,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies MarkdownBlock;
};

const createSnippetBlock = (id: string, sequence: number, snippetId: string): SnippetBlock => {
  const timestamp = Date.now();
  return {
    id,
    kind: 'snippet',
    snippetId,
    mode: 'transclude',
    sequence,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies SnippetBlock;
};

const createCommentBlock = (id: string, sequence: number, body: string): CommentBlock => {
  const timestamp = Date.now();
  return {
    id,
    kind: 'comment',
    body,
    sequence,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies CommentBlock;
};

export const createDemoDocument = (): DocumentModel => {
  const timestamp = Date.now();
  const blocks: DocumentModel['blocks'] = [
    createMarkdownBlock(
      'block-introduction',
      1,
      '# Welcome to ModuPrompt\n\nUse the notebook, node graph, snippets, and governance panels to manage your prompt workspace. This starter document keeps state in sync across views so you can explore interactions without wiring up a backend yet.',
    ),
    createSnippetBlock('block-snippet-greeting', 2, DEMO_SNIPPET_ID),
    createMarkdownBlock(
      'block-next-steps',
      3,
      '## Next steps\n- Draft prompt flows inside the notebook\n- Connect nodes visually in the graph\n- Govern readiness with statuses and audit trails\n- Compile deterministic exports in the preview pane',
    ),
    createCommentBlock('block-governance-note', 4, 'Remember to attach provenance metadata before exporting for review.'),
  ];

  const edges: Edge[] = [
    {
      id: 'edge-intro-to-snippet',
      source: 'block-introduction',
      target: 'block-snippet-greeting',
      kind: 'default',
      sourcePort: 'output',
      targetPort: 'input',
    },
    {
      id: 'edge-snippet-to-summary',
      source: 'block-snippet-greeting',
      target: 'block-next-steps',
      kind: 'default',
      sourcePort: 'output',
      targetPort: 'input',
    },
  ];

  const variables: VariableDefinition[] = [
    {
      id: 'variable-tone',
      key: 'tone',
      label: 'Tone',
      type: 'choice',
      options: [
        { label: 'Formal', value: 'formal' },
        { label: 'Friendly', value: 'friendly' },
      ],
      required: false,
    },
  ];

  return {
    id: DEMO_DOCUMENT_ID,
    schemaVersion: 2,
    title: 'Welcome prompt workspace',
    blocks,
    edges,
    variables,
    exportRecipes: [],
    tags: ['demo'],
    statusKey: 'draft',
    settings: {
      maxWidth: '80ch',
      theme: 'default',
      pageNumbering: 'none',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies DocumentModel;
};

export const seedWorkspaceStore = async (store: WorkspaceStore, document: DocumentModel): Promise<void> => {
  try {
    await store.upsertDocument(document);
  } catch (error) {
    // Document may already exist; ignore normalised conflicts.
  }

  const existingSettings = await store.getWorkspaceSettings();
  if (!existingSettings) {
    const now = Date.now();
    await store.saveWorkspaceSettings({
      schemaVersion: 1,
      exportRecipes: [],
      statuses: [
        { key: 'draft', name: 'Draft', color: '#475569', order: 1 },
        { key: 'review', name: 'Review', color: '#f59e0b', order: 2 },
        { key: 'approved', name: 'Approved', color: '#10b981', order: 3, isFinal: true },
      ],
      lastExportedAt: undefined,
      updatedAt: now,
    });
  }

  const snippet = await store.getSnippet(DEMO_SNIPPET_ID);
  if (!snippet) {
    const createdAt = Date.now();
    const baseSnippet: Snippet = {
      id: DEMO_SNIPPET_ID,
      title: 'Greeting snippet',
      path: 'demo/greeting',
      frontmatter: {
        schemaVersion: 1,
        tags: ['demo', 'introduction'],
        description: 'Reusable greeting that demonstrates snippet insertion.',
      },
      body: 'Hello {{ audience }}, welcome to ModuPrompt! This workspace keeps notebook and graph views aligned.',
      headRev: 0,
      createdAt,
      updatedAt: createdAt,
    };

    await store.upsertSnippet(baseSnippet);

    const hash = await computeIntegrityHash(baseSnippet.body, baseSnippet.frontmatter);
    const version: SnippetVersion = {
      snippetId: baseSnippet.id,
      rev: 1,
      parentRev: undefined,
      author: { id: 'system', name: 'Workspace Bootstrap' },
      note: 'Initial demo snippet',
      timestamp: createdAt,
      body: baseSnippet.body,
      frontmatter: baseSnippet.frontmatter,
      hash,
    };

    try {
      await store.putSnippetVersion(version);
    } catch (error) {
      if (!(error instanceof Error) || !/head revision/i.test(error.message)) {
        throw error;
      }
    }
  }
};
