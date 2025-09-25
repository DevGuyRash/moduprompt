export type { WorkspaceSettingsRecord } from './dexie/baseStore.js';
export { WorkspaceDexie, registerMigrations, resetDatabase } from './dexie/baseStore.js';
export {
  WorkspaceStore,
  createWorkspaceStore,
  type WorkspaceSnapshot,
} from './dexie/workspaceStore.js';
export { exportWorkspaceBackup, importWorkspaceBackup, type BackupOptions } from './opfs/backup.js';
export { writeTextFile, writeBinaryFile, readTextFile, removeEntry } from './opfs/workspaceFs.js';
export { computeIntegrityHash, verifySnippetIntegrity } from './internal/hash.js';
export {
  DEFAULT_STATUS_COLOR,
  normalizeStatusColor,
  normalizeStatusSchema,
  normalizeTags,
  validateStatusTransition,
  isExportAllowed,
  createStatusChangeAuditEntry,
  createTagChangeAuditEntry,
  buildStatusIndex,
  findStatus,
} from './governance/index.js';
export type {
  StatusTransitionInput,
  StatusTransitionResult,
  ExportPolicyInput,
  ExportPolicyResult,
  StatusIndex,
} from './governance/index.js';
export {
  bufferAuditEntry,
  listBufferedAuditEntries,
  flushBufferedAuditEntries,
  mergeAuditFeeds,
} from './audit/clientLogger.js';
export type { AuditBufferRecord } from './audit/types.js';
