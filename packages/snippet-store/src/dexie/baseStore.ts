import { Dexie, Table } from 'dexie';
import type {
  DocumentModel,
  ExportRecipe,
  Snippet,
  SnippetVersion,
  WorkspaceStatus,
} from '@moduprompt/types';
import { WORKSPACE_MIGRATIONS } from '../../migrations/workspace.js';
import type { WorkspaceMigration } from '../../migrations/types.js';
import type { AuditBufferRecord } from '../audit/types.js';

export interface WorkspaceSettingsRecord {
  id: 'workspace';
  statuses: WorkspaceStatus[];
  exportRecipes: ExportRecipe[];
  lastExportedAt?: number;
  updatedAt: number;
  schemaVersion: number;
}

export type WorkspaceDbTables = {
  documents: DocumentModel;
  snippets: Snippet;
  snippetVersions: SnippetVersion;
  workspaceSettings: WorkspaceSettingsRecord;
  auditBuffer: AuditBufferRecord;
};

const DEFAULT_DB_NAME = 'moduprompt-workspace';

export class WorkspaceDexie extends Dexie {
  documents!: Table<DocumentModel, string>;
  snippets!: Table<Snippet, string>;
  snippetVersions!: Table<SnippetVersion, [string, number]>;
  workspaceSettings!: Table<WorkspaceSettingsRecord, string>;
  auditBuffer!: Table<AuditBufferRecord, string>;

  constructor(name: string = DEFAULT_DB_NAME, migrations: WorkspaceMigration[] = WORKSPACE_MIGRATIONS) {
    super(name);
    registerMigrations(this, migrations);
  }
}

export const registerMigrations = (
  db: WorkspaceDexie,
  migrations: WorkspaceMigration[],
): void => {
  const seen = new Set<number>();
  const ordered = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of ordered) {
    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version detected: ${migration.version}`);
    }
    seen.add(migration.version);

    const version = db.version(migration.version).stores(migration.stores);
    if (migration.upgrade) {
      version.upgrade(migration.upgrade);
    }
  }
};

export const resetDatabase = async (db: WorkspaceDexie): Promise<void> => {
  await db.close();
  await db.delete();
};
