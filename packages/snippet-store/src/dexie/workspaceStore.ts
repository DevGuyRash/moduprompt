import type { DocumentModel, Snippet, SnippetVersion } from '@moduprompt/types';
import { WorkspaceDexie, type WorkspaceSettingsRecord } from './baseStore';
import type { WorkspaceMigration } from '../../migrations/types';
import { verifySnippetIntegrity } from '../internal/hash';
import { normalizeStatusSchema, normalizeTags } from '../governance';

export interface WorkspaceStoreOptions {
  dbName?: string;
  migrations?: WorkspaceMigration[];
}

const TABLE_NAMES = ['documents', 'snippets', 'snippetVersions', 'workspaceSettings', 'auditBuffer'] as const;

export class WorkspaceStore {
  private readonly db: WorkspaceDexie;

  constructor(private readonly options: WorkspaceStoreOptions = {}) {
    this.db = new WorkspaceDexie(options.dbName, options.migrations);
  }

  get database(): WorkspaceDexie {
    return this.db;
  }

  private async ensureReady(): Promise<void> {
    if (!this.db.isOpen()) {
      await this.db.open();
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  async clear(): Promise<void> {
    await this.ensureReady();
    const tableNames = Array.from(TABLE_NAMES);
    await this.db.transaction('rw', tableNames, async () => {
      for (const name of tableNames) {
        await this.db.table(name).clear();
      }
    });
  }

  async upsertDocument(document: DocumentModel): Promise<void> {
    if (document.schemaVersion !== 2) {
      throw new Error(`Unsupported document schema version: ${document.schemaVersion}`);
    }

    const normalized: DocumentModel = {
      ...document,
      tags: normalizeTags(document.tags),
    };

    await this.ensureReady();
    await this.db.documents.put(normalized);
  }

  async getDocument(id: string): Promise<DocumentModel | undefined> {
    await this.ensureReady();
    return this.db.documents.get(id);
  }

  async listDocuments(): Promise<DocumentModel[]> {
    await this.ensureReady();
    return this.db.documents.orderBy('updatedAt').reverse().toArray();
  }

  async deleteDocument(id: string): Promise<void> {
    await this.ensureReady();
    await this.db.documents.delete(id);
  }

  async upsertSnippet(snippet: Snippet): Promise<void> {
    await this.ensureReady();
    const payload: Snippet = {
      ...snippet,
      frontmatter: {
        ...snippet.frontmatter,
        tags: snippet.frontmatter.tags ? normalizeTags(snippet.frontmatter.tags) : undefined,
      },
    };
    await this.db.snippets.put(payload);
  }

  async getSnippet(id: string): Promise<Snippet | undefined> {
    await this.ensureReady();
    return this.db.snippets.get(id);
  }

  async listSnippets(): Promise<Snippet[]> {
    await this.ensureReady();
    return this.db.snippets.orderBy('updatedAt').reverse().toArray();
  }

  async putSnippetVersion(version: SnippetVersion): Promise<void> {
    await this.ensureReady();
    await verifySnippetIntegrity(version);

    await this.db.transaction('rw', ['snippets', 'snippetVersions'], async () => {
      const snippet = await this.db.snippets.get(version.snippetId);
      if (!snippet) {
        throw new Error(`Cannot create version for unknown snippet ${version.snippetId}`);
      }

      if (version.rev <= snippet.headRev) {
        throw new Error(`Snippet ${version.snippetId} already has head revision ${snippet.headRev}`);
      }

      await this.db.snippetVersions.put(version);
      await this.db.snippets.put({
        ...snippet,
        headRev: version.rev,
        updatedAt: version.timestamp,
      });
    });
  }

  async getSnippetVersion(snippetId: string, rev: number): Promise<SnippetVersion | undefined> {
    await this.ensureReady();
    return this.db.snippetVersions.get([snippetId, rev]);
  }

  async listSnippetVersions(snippetId: string): Promise<SnippetVersion[]> {
    await this.ensureReady();
    return this.db.snippetVersions.where('snippetId').equals(snippetId).reverse().toArray();
  }

  async saveWorkspaceSettings(record: Omit<WorkspaceSettingsRecord, 'id'>): Promise<void> {
    await this.ensureReady();
    const payload: WorkspaceSettingsRecord = {
      id: 'workspace',
      schemaVersion: record.schemaVersion,
      exportRecipes: [...record.exportRecipes],
      lastExportedAt: record.lastExportedAt,
      statuses: normalizeStatusSchema(record.statuses),
      updatedAt: record.updatedAt,
    };
    await this.db.workspaceSettings.put(payload);
  }

  async getWorkspaceSettings(): Promise<WorkspaceSettingsRecord | undefined> {
    await this.ensureReady();
    return this.db.workspaceSettings.get('workspace');
  }

  async exportSnapshot(): Promise<WorkspaceSnapshot> {
    await this.ensureReady();
    const [documents, snippets, snippetVersions, workspaceSettings] = await Promise.all([
      this.db.documents.toArray(),
      this.db.snippets.toArray(),
      this.db.snippetVersions.toArray(),
      this.db.workspaceSettings.get('workspace'),
    ]);

    return {
      exportedAt: Date.now(),
      documents,
      snippets,
      snippetVersions,
      workspaceSettings: workspaceSettings ?? null,
    };
  }

  async importSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
    await this.ensureReady();
    await Promise.all(snapshot.snippetVersions.map((version) => verifySnippetIntegrity(version)));

    const tableNames = Array.from(TABLE_NAMES);
    await this.db.transaction('rw', tableNames, async () => {
      for (const name of tableNames) {
        await this.db.table(name).clear();
      }

      await this.db.documents.bulkPut(
        snapshot.documents.map((doc) => ({
          ...doc,
          tags: normalizeTags(doc.tags),
        })),
      );

      await this.db.snippets.bulkPut(
        snapshot.snippets.map((snippet) => ({
          ...snippet,
          frontmatter: {
            ...snippet.frontmatter,
            tags: snippet.frontmatter.tags ? normalizeTags(snippet.frontmatter.tags) : undefined,
          },
        })),
      );

      await this.db.snippetVersions.bulkPut(snapshot.snippetVersions);

      if (snapshot.workspaceSettings) {
        await this.db.workspaceSettings.put({
          ...snapshot.workspaceSettings,
          statuses: normalizeStatusSchema(snapshot.workspaceSettings.statuses),
          id: 'workspace',
        });
      }
    });
  }
}

export interface WorkspaceSnapshot {
  exportedAt: number;
  documents: DocumentModel[];
  snippets: Snippet[];
  snippetVersions: SnippetVersion[];
  workspaceSettings: WorkspaceSettingsRecord | null;
}

export const createWorkspaceStore = (options?: WorkspaceStoreOptions): WorkspaceStore =>
  new WorkspaceStore(options);
