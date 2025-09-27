import type { DocumentModel } from '@moduprompt/types';
import type { WorkspaceStore } from '@moduprompt/snippet-store';
import type { DocumentStoreApi } from '../../state/document-model.js';
import { DocumentsApi } from '../api/documents.js';
import { SnippetsApi } from '../api/snippets.js';
import type { DocumentStoreValue } from '../../state/document-model.js';

export type WorkspaceLogLevel = 'info' | 'warn' | 'error';

export type WorkspaceLogger = (
  level: WorkspaceLogLevel,
  message: string,
  context?: Record<string, unknown>,
) => void;

export interface WorkspaceOrchestratorOptions {
  documentStore: DocumentStoreApi;
  workspaceStore: WorkspaceStore;
  documentsApi: DocumentsApi;
  snippetsApi: SnippetsApi;
  offlineEnabled: boolean;
  debounceMs?: number;
  logger?: WorkspaceLogger;
}

interface SyncedDocumentSnapshot {
  version: number;
  snapshot: DocumentModel;
}

const DEFAULT_DEBOUNCE_MS = 500;

const cloneDocument = (document: DocumentModel): DocumentModel =>
  typeof structuredClone === 'function'
    ? structuredClone(document)
    : (JSON.parse(JSON.stringify(document)) as DocumentModel);

const defaultLogger: WorkspaceLogger = (level, message, context) => {
  if (typeof console === 'undefined') {
    return;
  }
  const payload = context ? [message, context] : [message];
  if (level === 'error') {
    console.error(...payload);
  } else if (level === 'warn') {
    console.warn(...payload);
  } else {
    console.info(...payload);
  }
};

export interface WorkspaceInitializationSummary {
  localDocuments: number;
  remoteDocuments: number;
  localSnippets: number;
  remoteSnippets: number;
}

export class WorkspaceOrchestrator {
  private readonly documentStore: DocumentStoreApi;
  private readonly workspaceStore: WorkspaceStore;
  private readonly documentsApi: DocumentsApi;
  private readonly snippetsApi: SnippetsApi;
  private readonly logger: WorkspaceLogger;
  private readonly debounceMs: number;
  private initialized = false;
  private unsubscribeDocuments?: () => void;
  private readonly syncedDocuments = new Map<string, SyncedDocumentSnapshot>();
  private readonly pendingSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly inFlightVersions = new Map<string, number>();

  constructor(options: WorkspaceOrchestratorOptions) {
    this.documentStore = options.documentStore;
    this.workspaceStore = options.workspaceStore;
    this.documentsApi = options.documentsApi;
    this.snippetsApi = options.snippetsApi;
    this.logger = options.logger ?? defaultLogger;
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.offlineEnabled = options.offlineEnabled;
  }

  private readonly offlineEnabled: boolean;

  async initialize(): Promise<WorkspaceInitializationSummary> {
    if (this.initialized) {
      return {
        localDocuments: this.syncedDocuments.size,
        remoteDocuments: 0,
        localSnippets: 0,
        remoteSnippets: 0,
      };
    }

    const summary: WorkspaceInitializationSummary = {
      localDocuments: 0,
      remoteDocuments: 0,
      localSnippets: 0,
      remoteSnippets: 0,
    };

    if (this.offlineEnabled) {
      const { documents, snippets } = await this.hydrateFromStorage();
      summary.localDocuments = documents;
      summary.localSnippets = snippets;
    }

    const remoteSummary = await this.syncFromServer();
    summary.remoteDocuments = remoteSummary.documents;
    summary.remoteSnippets = remoteSummary.snippets;

    this.registerDocumentSubscription();
    this.initialized = true;

    return summary;
  }

  dispose(): void {
    this.unsubscribeDocuments?.();
    this.unsubscribeDocuments = undefined;
    for (const timer of this.pendingSyncTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingSyncTimers.clear();
    this.inFlightVersions.clear();
    this.syncedDocuments.clear();
    this.initialized = false;
  }

  private async hydrateFromStorage(): Promise<{ documents: number; snippets: number }> {
    let documentCount = 0;
    try {
      const documents = await this.workspaceStore.listDocuments();
      const store = this.documentStore.getState();
      for (const [index, document] of documents.entries()) {
        store.loadDocument(document, { activate: index === 0 });
        const record = this.documentStore.getState().documents[document.id];
        if (record) {
          this.syncedDocuments.set(document.id, {
            version: record.version,
            snapshot: cloneDocument(record.model),
          });
          documentCount += 1;
        }
      }
    } catch (error) {
      this.log('warn', 'Failed to hydrate documents from Dexie', { error });
    }

    let snippetCount = 0;
    try {
      const snippets = await this.workspaceStore.listSnippets();
      snippetCount = snippets.length;
    } catch (error) {
      this.log('warn', 'Failed to hydrate snippets from Dexie', { error });
    }

    return { documents: documentCount, snippets: snippetCount };
  }

  private async syncFromServer(): Promise<{ documents: number; snippets: number }> {
    let documentCount = 0;
    try {
      const { items } = await this.documentsApi.list();
      for (const [index, document] of items.entries()) {
        await this.applyServerDocument(document, { activateIfEmpty: index === 0 });
        documentCount += 1;
      }
    } catch (error) {
      this.log('warn', 'Failed to load documents from API', { error });
    }

    let snippetCount = 0;
    try {
      const { items } = await this.snippetsApi.list();
      for (const snippet of items) {
        await this.workspaceStore.upsertSnippet(snippet);
        snippetCount += 1;
        try {
          const detail = await this.snippetsApi.get(snippet.id);
          await this.workspaceStore.upsertSnippet(detail.snippet);
          for (const version of detail.versions) {
            try {
              await this.workspaceStore.putSnippetVersion(version);
            } catch (versionError) {
              if (
                !(versionError instanceof Error) ||
                !/already has head revision/i.test(versionError.message)
              ) {
                throw versionError;
              }
            }
          }
        } catch (detailError) {
          this.log('warn', 'Failed to load snippet detail', {
            error: detailError,
            snippetId: snippet.id,
          });
        }
      }
    } catch (error) {
      this.log('warn', 'Failed to load snippets from API', { error });
    }

    return { documents: documentCount, snippets: snippetCount };
  }

  private registerDocumentSubscription(): void {
    this.unsubscribeDocuments = this.documentStore.subscribe(
      (state) => state.documents,
      (nextDocuments, previousDocuments) => {
        this.handleDocumentChanges(previousDocuments ?? {}, nextDocuments);
      },
    );
  }

  private handleDocumentChanges(
    previous: DocumentStoreValue['documents'],
    next: DocumentStoreValue['documents'],
  ): void {
    if (!this.initialized) {
      return;
    }

    for (const [documentId, record] of Object.entries(next)) {
      const synced = this.syncedDocuments.get(documentId);
      const inFlight = this.inFlightVersions.get(documentId) ?? 0;
      const baselineVersion = Math.max(synced?.version ?? 0, inFlight);
      if (record.version > baselineVersion) {
        this.queuePersistence(documentId);
      }
    }

    for (const documentId of Object.keys(previous)) {
      if (!next[documentId]) {
        this.syncedDocuments.delete(documentId);
        this.cancelPending(documentId);
        this.inFlightVersions.delete(documentId);
      }
    }
  }

  private queuePersistence(documentId: string): void {
    this.cancelPending(documentId);
    const timer = setTimeout(() => {
      this.pendingSyncTimers.delete(documentId);
      void this.persistDocument(documentId);
    }, this.debounceMs);
    this.pendingSyncTimers.set(documentId, timer);
  }

  private cancelPending(documentId: string): void {
    const timer = this.pendingSyncTimers.get(documentId);
    if (timer) {
      clearTimeout(timer);
      this.pendingSyncTimers.delete(documentId);
    }
  }

  private async persistDocument(documentId: string): Promise<void> {
    const state = this.documentStore.getState();
    const record = state.documents[documentId];
    if (!record) {
      return;
    }

    this.inFlightVersions.set(documentId, record.version);
    const snapshot = cloneDocument(record.model);

    try {
      const response = await this.documentsApi.update(documentId, {
        title: snapshot.title,
        blocks: snapshot.blocks,
        edges: snapshot.edges,
        variables: snapshot.variables,
        exportRecipes: snapshot.exportRecipes,
        tags: snapshot.tags,
        statusKey: snapshot.statusKey,
        settings: snapshot.settings,
      });

      await this.workspaceStore.upsertDocument(response);
      await this.applyServerDocument(response);
      const updatedRecord = this.documentStore.getState().documents[documentId];
      if (updatedRecord) {
        this.syncedDocuments.set(documentId, {
          version: updatedRecord.version,
          snapshot: cloneDocument(updatedRecord.model),
        });
      }
    } catch (error) {
      this.log('error', 'Failed to persist document changes', { error, documentId });
      const previous = this.syncedDocuments.get(documentId);
      if (previous) {
        await this.applyServerDocument(previous.snapshot);
      }
    } finally {
      this.inFlightVersions.delete(documentId);
    }
  }

  private async applyServerDocument(
    document: DocumentModel,
    options: { activateIfEmpty?: boolean } = {},
  ): Promise<void> {
    const store = this.documentStore.getState();
    const current = store.documents[document.id];
    await this.workspaceStore.upsertDocument(document);

    if (!current) {
      const shouldActivate =
        options.activateIfEmpty === true && Object.keys(store.documents).length === 0;
      store.loadDocument(document, { activate: shouldActivate });
      const loadedRecord = this.documentStore.getState().documents[document.id];
      if (loadedRecord) {
        this.syncedDocuments.set(document.id, {
          version: loadedRecord.version,
          snapshot: cloneDocument(loadedRecord.model),
        });
      }
      return;
    }

    store.runTransaction(
      document.id,
      (draft) => {
        draft.title = document.title;
        draft.blocks = document.blocks as typeof draft.blocks;
        draft.edges = document.edges as typeof draft.edges;
        draft.variables = document.variables as typeof draft.variables;
        draft.exportRecipes = document.exportRecipes as typeof draft.exportRecipes;
        draft.tags = [...document.tags];
        draft.statusKey = document.statusKey;
        draft.settings = { ...document.settings } as typeof draft.settings;
        draft.createdAt = document.createdAt;
        draft.updatedAt = document.updatedAt;
      },
      { captureHistory: false },
    );

    const updatedRecord = this.documentStore.getState().documents[document.id];
    if (updatedRecord) {
      this.syncedDocuments.set(document.id, {
        version: updatedRecord.version,
        snapshot: cloneDocument(updatedRecord.model),
      });
    }
  }

  private log(level: WorkspaceLogLevel, message: string, context?: Record<string, unknown>): void {
    this.logger(level, message, context);
  }
}
