import type { DocumentModel, Snippet, SnippetVersion, JsonValue } from '@moduprompt/types';
import { WorkspaceDexie, type WorkspaceSettingsRecord } from './baseStore.js';
import type { WorkspaceMigration } from '../../migrations/types.js';
import { computeIntegrityHash, computeSha256Hex, verifySnippetIntegrity } from '../internal/hash.js';
import { normalizeStatusSchema, normalizeTags } from '../governance/index.js';
import { createMigrationAuditEntry } from '../audit/migrations.js';
import { sanitizeAuditEntry } from '../audit/sanitize.js';
import type { AuditBufferRecord } from '../audit/types.js';
import { stableStringify } from '../internal/stableJson.js';

export interface WorkspaceStoreOptions {
  dbName?: string;
  migrations?: WorkspaceMigration[];
}

const TABLE_NAMES = ['documents', 'snippets', 'snippetVersions', 'workspaceSettings', 'auditBuffer'] as const;

const MIGRATION_ID_PREFIX = 'workspace-migration-v';
const MIGRATION_YIELD_INTERVAL = 50;
const MAX_AUDIT_BUFFER_RECORDS = 1000;

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const randomId = (): string => {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const createMigrationId = (version: number): string => `${MIGRATION_ID_PREFIX}${version}-${randomId()}`;

interface SchemaUpgradeContext {
  db: WorkspaceDexie;
}

interface SchemaUpgradeResult {
  itemsProcessed?: number;
  itemsUpdated?: number;
  notes?: string;
}

interface SchemaUpgrade {
  version: number;
  description: string;
  run: (context: SchemaUpgradeContext) => Promise<SchemaUpgradeResult | void>;
}

const SCHEMA_UPGRADES: SchemaUpgrade[] = [
  {
    version: 1,
    description: 'Normalize document metadata for deterministic offline recovery',
    run: async ({ db }) => {
      let processed = 0;
      let updated = 0;
      await db.documents.toCollection().each(async (document) => {
        processed += 1;
        const normalizedTags = normalizeTags(document.tags);
        if (
          normalizedTags.length !== document.tags.length ||
          normalizedTags.some((value, index) => value !== document.tags[index])
        ) {
          await db.documents.put({
            ...document,
            tags: normalizedTags,
          });
          updated += 1;
        }
        if (processed % MIGRATION_YIELD_INTERVAL === 0) {
          await yieldToEventLoop();
        }
      });
      return {
        itemsProcessed: processed,
        itemsUpdated: updated,
        notes: 'Normalized document tag ordering.',
      } satisfies SchemaUpgradeResult;
    },
  },
  {
    version: 2,
    description: 'Recompute snippet integrity hashes to avoid drift',
    run: async ({ db }) => {
      let processed = 0;
      let updated = 0;
      await db.snippetVersions.toCollection().each(async (version) => {
        processed += 1;
        const expected = await computeIntegrityHash(version.body, version.frontmatter);
        if (version.hash !== expected) {
          await db.snippetVersions.put({
            ...version,
            hash: expected,
          });
          updated += 1;
        }
        if (processed % MIGRATION_YIELD_INTERVAL === 0) {
          await yieldToEventLoop();
        }
      });
      return {
        itemsProcessed: processed,
        itemsUpdated: updated,
        notes: updated > 0 ? 'Repaired snippet integrity hashes.' : 'Hashes already consistent.',
      } satisfies SchemaUpgradeResult;
    },
  },
  {
    version: 3,
    description: 'Trim buffered audit events to respect storage quotas',
    run: async ({ db }) => {
      const table = db.auditBuffer;
      if (!table) {
        return { notes: 'Audit buffer not initialized; skipping trim.' } satisfies SchemaUpgradeResult;
      }
      const total = await table.count();
      if (total <= MAX_AUDIT_BUFFER_RECORDS) {
        return {
          itemsProcessed: total,
          itemsUpdated: 0,
          notes: 'Audit buffer within configured bounds.',
        } satisfies SchemaUpgradeResult;
      }

      const keysToRemove = (await table
        .orderBy('bufferedAt')
        .reverse()
        .offset(MAX_AUDIT_BUFFER_RECORDS)
        .primaryKeys()) as string[];

      if (keysToRemove.length > 0) {
        await table.bulkDelete(keysToRemove);
      }

      return {
        itemsProcessed: total,
        itemsUpdated: keysToRemove.length,
        notes: 'Trimmed excess audit buffer entries.',
      } satisfies SchemaUpgradeResult;
    },
  },
];

const SCHEMA_UPGRADE_MAP = new Map<number, SchemaUpgrade>(
  SCHEMA_UPGRADES.map((upgrade) => [upgrade.version, upgrade] as const),
);

export class WorkspaceStore {
  private readonly db: WorkspaceDexie;
  private schemaReady = false;
  private schemaPromise: Promise<void> | null = null;

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
    await this.ensureSchemaApplied();
  }

  private async ensureSchemaApplied(): Promise<void> {
    if (this.schemaReady) {
      return;
    }
    if (!this.schemaPromise) {
      this.schemaPromise = this.applySchemaUpgrades();
    }
    try {
      await this.schemaPromise;
      this.schemaReady = true;
    } finally {
      this.schemaPromise = null;
    }
  }

  private async applySchemaUpgrades(): Promise<void> {
    const targetVersion = Math.trunc(this.db.verno);
    let settings = await this.db.workspaceSettings.get('workspace');
    const currentVersion = settings?.schemaVersion ?? 0;

    if (currentVersion > targetVersion) {
      throw new Error(
        `Workspace schema version ${currentVersion} exceeds runtime capability ${targetVersion}.`,
      );
    }

    if (currentVersion === targetVersion) {
      if (!settings && targetVersion > 0) {
        settings = await this.persistSchemaVersion(null, targetVersion, Date.now());
      }
      return;
    }

    let version = currentVersion;
    while (version < targetVersion) {
      const nextVersion = version + 1;
      const upgrade = SCHEMA_UPGRADE_MAP.get(nextVersion);
      const startedAt = Date.now();
      const result = upgrade ? await upgrade.run({ db: this.db }) : undefined;
      const finishedAt = Date.now();

      settings = await this.persistSchemaVersion(settings ?? null, nextVersion, finishedAt);
      await this.logMigration({
        fromVersion: version,
        toVersion: nextVersion,
        startedAt,
        finishedAt,
        result,
      });

      version = nextVersion;
    }
  }

  private async persistSchemaVersion(
    previous: WorkspaceSettingsRecord | null,
    schemaVersion: number,
    timestamp: number,
  ): Promise<WorkspaceSettingsRecord> {
    const next: WorkspaceSettingsRecord = previous
      ? {
          ...previous,
          schemaVersion,
          updatedAt: timestamp,
        }
      : {
          id: 'workspace',
          statuses: [],
          exportRecipes: [],
          lastExportedAt: undefined,
          schemaVersion,
          updatedAt: timestamp,
        };

    await this.db.workspaceSettings.put(next);
    return next;
  }

  private async logMigration({
    fromVersion,
    toVersion,
    startedAt,
    finishedAt,
    result,
  }: {
    fromVersion: number;
    toVersion: number;
    startedAt: number;
    finishedAt: number;
    result?: SchemaUpgradeResult | void;
  }): Promise<void> {
    if (toVersion <= fromVersion) {
      return;
    }

    if (!this.db.tables.some((table) => table.name === 'auditBuffer')) {
      return;
    }

    const metadata: SchemaUpgradeResult = {};
    if (typeof result?.itemsProcessed === 'number') {
      metadata.itemsProcessed = result.itemsProcessed;
    }
    if (typeof result?.itemsUpdated === 'number') {
      metadata.itemsUpdated = result.itemsUpdated;
    }
    if (result?.notes) {
      metadata.notes = result.notes;
    }

    const entry = createMigrationAuditEntry({
      id: createMigrationId(toVersion),
      fromVersion,
      toVersion,
      startedAt,
      finishedAt,
      metadata,
    });

    const sanitized = sanitizeAuditEntry(entry);

    const record: AuditBufferRecord = {
      id: sanitized.id,
      entry: sanitized,
      bufferedAt: Date.now(),
      attempts: 0,
    };

    try {
      await this.db.auditBuffer.put(record);
    } catch (error) {
      console.warn('Failed to buffer migration audit entry', { error });
    }
  }

  private async computeSnapshotIntegrity(
    snapshot: Omit<WorkspaceSnapshot, 'integrityHash'>,
  ): Promise<string> {
    return computeSha256Hex(stableStringify(snapshot as unknown as JsonValue));
  }

  async initialize(): Promise<void> {
    await this.ensureReady();
  }

  async close(): Promise<void> {
    await this.db.close();
    this.schemaReady = false;
    this.schemaPromise = null;
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
    const normalizedSchemaVersion = Math.max(record.schemaVersion, Math.trunc(this.db.verno));
    const payload: WorkspaceSettingsRecord = {
      id: 'workspace',
      schemaVersion: normalizedSchemaVersion,
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

    const schemaVersion = workspaceSettings?.schemaVersion ?? Math.trunc(this.db.verno);
    const baseSnapshot = {
      exportedAt: Date.now(),
      schemaVersion,
      documents,
      snippets,
      snippetVersions,
      workspaceSettings: workspaceSettings ?? null,
    } satisfies Omit<WorkspaceSnapshot, 'integrityHash'>;

    const integrityHash = await this.computeSnapshotIntegrity(baseSnapshot);

    return {
      ...baseSnapshot,
      integrityHash,
    } satisfies WorkspaceSnapshot;
  }

  async importSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
    await this.ensureReady();

    const schemaVersion = snapshot.schemaVersion ?? Math.trunc(this.db.verno);
    const baseSnapshot = {
      exportedAt: snapshot.exportedAt,
      schemaVersion,
      documents: snapshot.documents,
      snippets: snapshot.snippets,
      snippetVersions: snapshot.snippetVersions,
      workspaceSettings: snapshot.workspaceSettings,
    } satisfies Omit<WorkspaceSnapshot, 'integrityHash'>;

    if (snapshot.integrityHash) {
      const expected = await this.computeSnapshotIntegrity(baseSnapshot);
      if (expected !== snapshot.integrityHash) {
        throw new Error('Workspace snapshot integrity hash mismatch.');
      }
    }

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

      const workspaceRecord = snapshot.workspaceSettings
        ? {
            ...snapshot.workspaceSettings,
            statuses: normalizeStatusSchema(snapshot.workspaceSettings.statuses),
            schemaVersion,
            id: 'workspace',
          }
        : {
            id: 'workspace',
            statuses: [],
            exportRecipes: [],
            lastExportedAt: undefined,
            schemaVersion,
            updatedAt: Date.now(),
          } satisfies WorkspaceSettingsRecord;

      await this.db.workspaceSettings.put(workspaceRecord);
    });

    this.schemaReady = false;
    await this.ensureSchemaApplied();
  }
}

export interface WorkspaceSnapshot {
  exportedAt: number;
  schemaVersion: number;
  documents: DocumentModel[];
  snippets: Snippet[];
  snippetVersions: SnippetVersion[];
  workspaceSettings: WorkspaceSettingsRecord | null;
  integrityHash: string;
}

export const createWorkspaceStore = (options?: WorkspaceStoreOptions): WorkspaceStore =>
  new WorkspaceStore(options);
