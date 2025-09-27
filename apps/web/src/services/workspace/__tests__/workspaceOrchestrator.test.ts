import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { DocumentModel, Snippet, SnippetVersion } from '@moduprompt/types';
import type { WorkspaceStore } from '@moduprompt/snippet-store';
import { createDocumentStore } from '../../../state/document-model.js';
import { WorkspaceOrchestrator } from '../workspaceOrchestrator.js';
import type { DocumentsApi } from '../../api/documents.js';
import type { SnippetsApi } from '../../api/snippets.js';

class InMemoryWorkspaceStore {
  documents = new Map<string, DocumentModel>();
  snippets = new Map<string, Snippet>();
  versions = new Map<string, SnippetVersion[]>();

  async initialize(): Promise<void> {}

  async listDocuments(): Promise<DocumentModel[]> {
    return Array.from(this.documents.values());
  }

  async upsertDocument(document: DocumentModel): Promise<void> {
    this.documents.set(document.id, document);
  }

  async listSnippets(): Promise<Snippet[]> {
    return Array.from(this.snippets.values());
  }

  async upsertSnippet(snippet: Snippet): Promise<void> {
    this.snippets.set(snippet.id, snippet);
  }

  async putSnippetVersion(version: SnippetVersion): Promise<void> {
    const list = this.versions.get(version.snippetId) ?? [];
    const filtered = list.filter((entry) => entry.rev !== version.rev);
    filtered.push(version);
    this.versions.set(version.snippetId, filtered);
  }
}

describe('WorkspaceOrchestrator', () => {
  const baseDocument: DocumentModel = {
    id: 'doc-1',
    schemaVersion: 2,
    title: 'Example Document',
    blocks: [],
    edges: [],
    variables: [],
    exportRecipes: [],
    tags: [],
    statusKey: 'draft',
    settings: { maxWidth: '80ch' },
    createdAt: 1,
    updatedAt: 1,
  };

  let workspaceStore: InMemoryWorkspaceStore;
  let documentStore = createDocumentStore();
  let documentsApi: DocumentsApi;
  let snippetsApi: SnippetsApi;
  let orchestrator: WorkspaceOrchestrator;

  beforeEach(() => {
    vi.useFakeTimers();
    workspaceStore = new InMemoryWorkspaceStore();
    documentStore = createDocumentStore();

    const mockDocumentsApi = {
      list: vi.fn(async () => ({ items: [baseDocument] })),
      update: vi.fn(async (_id: string, payload: Partial<DocumentModel>) => ({
        ...baseDocument,
        ...payload,
        updatedAt: 2,
      } satisfies DocumentModel)),
    } satisfies Partial<DocumentsApi> as DocumentsApi;

    const mockSnippetsApi = {
      list: vi.fn(async () => ({ items: [] })),
      get: vi.fn(),
    } satisfies Partial<SnippetsApi> as SnippetsApi;

    documentsApi = mockDocumentsApi;
    snippetsApi = mockSnippetsApi;

    orchestrator = new WorkspaceOrchestrator({
      documentStore,
      workspaceStore: workspaceStore as unknown as WorkspaceStore,
      documentsApi,
      snippetsApi,
      offlineEnabled: false,
      debounceMs: 0,
      logger: () => {},
    });
  });

  afterEach(() => {
    orchestrator.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads remote documents and persists updates back to the API', async () => {
    await orchestrator.initialize();

    const state = documentStore.getState();
    expect(Object.keys(state.documents)).toContain(baseDocument.id);
    expect(workspaceStore.documents.get(baseDocument.id)?.title).toBe('Example Document');

    state.runTransaction(baseDocument.id, (draft) => {
      draft.title = 'Updated Title';
    });

    await vi.runAllTimersAsync();
    await Promise.resolve();
    await (orchestrator as unknown as { persistDocument: (id: string) => Promise<void> }).persistDocument(
      baseDocument.id,
    );

    const updateSpy = documentsApi.update as unknown as Mock;
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(baseDocument.id, expect.objectContaining({ title: 'Updated Title' }));

    const updated = documentStore.getState().documents[baseDocument.id];
    expect(updated?.model.title).toBe('Updated Title');
    expect(workspaceStore.documents.get(baseDocument.id)?.title).toBe('Updated Title');
  });
});
