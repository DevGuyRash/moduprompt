import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  DocumentModel,
  ExportRecipe,
  Snippet,
  SnippetVersion,
  WorkspaceStatus,
} from '@moduprompt/types';
import { computeIntegrityHash } from '@moduprompt/snippet-store';
import type { WorkspaceStore, WorkspaceSettingsRecord } from '@moduprompt/snippet-store';
import {
  createDocumentStore,
  DocumentStoreProvider,
  type DocumentStoreApi,
} from '../../../state/document-model';
import { PreviewPane } from '../PreviewPane';

class MemoryWorkspaceStore {
  private snippets = new Map<string, Snippet>();
  private versions = new Map<string, SnippetVersion[]>();
  private settings: WorkspaceSettingsRecord | null = null;

  constructor(settings?: WorkspaceSettingsRecord) {
    this.settings = settings ?? null;
  }

  setSettings(record: WorkspaceSettingsRecord) {
    this.settings = record;
  }

  async listSnippets(): Promise<Snippet[]> {
    return Array.from(this.snippets.values()).map((snippet) => ({
      ...snippet,
      frontmatter: { ...snippet.frontmatter },
    }));
  }

  async listSnippetVersions(snippetId: string): Promise<SnippetVersion[]> {
    return (this.versions.get(snippetId) ?? []).map((version) => ({
      ...version,
      frontmatter: { ...version.frontmatter },
    }));
  }

  async getWorkspaceSettings(): Promise<WorkspaceSettingsRecord | undefined> {
    return this.settings ? { ...this.settings, statuses: [...this.settings.statuses], exportRecipes: [...this.settings.exportRecipes] } : undefined;
  }

  async addSnippet(snippet: Snippet, versions: SnippetVersion[]): Promise<void> {
    this.snippets.set(snippet.id, { ...snippet, frontmatter: { ...snippet.frontmatter } });
    this.versions.set(
      snippet.id,
      versions.map((version) => ({
        ...version,
        frontmatter: { ...version.frontmatter },
      })),
    );
  }
}

type WorkspaceStoreLike = MemoryWorkspaceStore;

const createDocument = (overrides: Partial<DocumentModel> = {}): DocumentModel => ({
  id: 'doc-1',
  title: 'Governed prompt',
  schemaVersion: 2,
  blocks: [
    {
      id: 'block-1',
      kind: 'markdown',
      sequence: 1,
      body: 'Hello world',
      createdAt: 10,
      updatedAt: 10,
    },
  ],
  edges: [],
  variables: [],
  exportRecipes: [],
  tags: [],
  statusKey: 'draft',
  settings: { maxWidth: '80ch' },
  createdAt: 10,
  updatedAt: 10,
  ...overrides,
});

const baseStatuses: WorkspaceStatus[] = [
  { key: 'draft', name: 'Draft', color: '#475569', order: 1 },
  { key: 'approved', name: 'Approved', color: '#10b981', order: 2, isFinal: true },
];

const createSettings = (recipes: ExportRecipe[] = []): WorkspaceSettingsRecord => ({
  id: 'workspace',
  statuses: baseStatuses,
  exportRecipes: recipes,
  schemaVersion: 1,
  updatedAt: Date.now(),
});

const loadDocument = (store: DocumentStoreApi, document: DocumentModel) => {
  store.getState().loadDocument(document, { activate: true });
};

describe('PreviewPane', () => {
  let documentStore: DocumentStoreApi;

  beforeEach(() => {
    documentStore = createDocumentStore();
  });

  it('renders preview markdown and updates after document changes', async () => {
    const workspaceStore = new MemoryWorkspaceStore(createSettings());
    loadDocument(documentStore, createDocument());

    render(
      <DocumentStoreProvider store={documentStore}>
        <PreviewPane documentId="doc-1" store={workspaceStore as unknown as WorkspaceStore} />
      </DocumentStoreProvider>,
    );

    await waitFor(() => {
      const node = screen.getByTitle('Document preview');
      expect(node.getAttribute('srcdoc')).toContain('Hello world');
    });

    documentStore.getState().updateBlock('doc-1', 'block-1', (draft) => {
      if ('body' in draft) {
        draft.body = 'Updated body';
      }
    });

    await waitFor(() => {
      const node = screen.getByTitle('Document preview');
      expect(node.getAttribute('srcdoc')).toContain('Updated body');
    });
  });

  it('disables export when status gating blocks the document', async () => {
    const recipes: ExportRecipe[] = [
      {
        id: 'regulated',
        name: 'Regulated PDF',
        type: 'pdf',
        include: { all: true },
        allowedStatuses: ['approved'],
      },
    ];
    const workspaceStore = new MemoryWorkspaceStore(createSettings(recipes));
    const document = createDocument({
      statusKey: 'draft',
      exportRecipes: [{ recipeId: 'regulated', includeProvenance: true }],
    });
    loadDocument(documentStore, document);

    render(
      <DocumentStoreProvider store={documentStore}>
        <PreviewPane documentId="doc-1" store={workspaceStore as unknown as WorkspaceStore} />
      </DocumentStoreProvider>,
    );

    await screen.findByRole('heading', { name: /preflight/i });
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((node) => /not allowed for export/i.test(node.textContent ?? ''))).toBe(true);
    });

    const exportButton = await screen.findByRole('button', { name: /resolve preflight issues/i });
    expect(exportButton).toBeDisabled();
  });

  it('surfaces missing snippet diagnostics and blocks export', async () => {
    const workspaceStore = new MemoryWorkspaceStore(createSettings());
    const document = createDocument({
      blocks: [
        {
          id: 'snippet-block',
          kind: 'snippet',
          sequence: 1,
          snippetId: 'missing-snippet',
          mode: 'transclude',
          createdAt: 42,
          updatedAt: 42,
        },
      ],
    });
    loadDocument(documentStore, document);

    render(
      <DocumentStoreProvider store={documentStore}>
        <PreviewPane documentId="doc-1" store={workspaceStore as unknown as WorkspaceStore} />
      </DocumentStoreProvider>,
    );

    await screen.findByText(/cannot be resolved/i);
    const exportButton = await screen.findByRole('button', { name: /resolve preflight issues/i });
    expect(exportButton).toBeDisabled();
  });

  it('allows export callback when issues are resolved and recipe selected', async () => {
    const snippet: Snippet = {
      id: 'snippet-alpha',
      title: 'Alpha',
      path: 'library/alpha',
      frontmatter: { schemaVersion: 1 },
      body: 'Snippet body',
      headRev: 1,
      createdAt: 100,
      updatedAt: 100,
    };
    const version: SnippetVersion = {
      snippetId: snippet.id,
      rev: 1,
      timestamp: 100,
      body: 'Snippet body',
      frontmatter: { schemaVersion: 1 },
      hash: await computeIntegrityHash('Snippet body', { schemaVersion: 1 }),
    };

    const recipes: ExportRecipe[] = [
      {
        id: 'markdown',
        name: 'Markdown Export',
        type: 'markdown',
        include: { all: true },
        allowedStatuses: ['draft', 'approved'],
      },
    ];
    const workspaceStore = new MemoryWorkspaceStore(createSettings(recipes));
    await workspaceStore.addSnippet(snippet, [version]);

    const document = createDocument({
      statusKey: 'draft',
      exportRecipes: [{ recipeId: 'markdown', includeProvenance: false }],
    });
    loadDocument(documentStore, document);

    const onExport = vi.fn();

    render(
      <DocumentStoreProvider store={documentStore}>
        <PreviewPane
          documentId="doc-1"
          store={workspaceStore as unknown as WorkspaceStore}
          onExport={({ recipe, result }) => onExport(recipe.id, result?.hash)}
        />
      </DocumentStoreProvider>,
    );

    const button = await screen.findByRole('button', { name: /export/i });
    expect(button).toBeEnabled();
    await userEvent.click(button);

    await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
    expect(onExport.mock.calls[0]![0]).toBe('markdown');
  });
});
