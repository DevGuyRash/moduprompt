export type { WorkspaceSettingsRecord } from './dexie/baseStore';
export { WorkspaceDexie, registerMigrations, resetDatabase } from './dexie/baseStore';
export {
  WorkspaceStore,
  createWorkspaceStore,
  type WorkspaceSnapshot,
} from './dexie/workspaceStore';
export { exportWorkspaceBackup, importWorkspaceBackup, type BackupOptions } from './opfs/backup';
export { writeTextFile, writeBinaryFile, readTextFile, removeEntry } from './opfs/workspaceFs';
export { computeIntegrityHash, verifySnippetIntegrity } from './internal/hash';
