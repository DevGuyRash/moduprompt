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
} from './governance';
export type {
  StatusTransitionInput,
  StatusTransitionResult,
  ExportPolicyInput,
  ExportPolicyResult,
  StatusIndex,
} from './governance';
export {
  bufferAuditEntry,
  listBufferedAuditEntries,
  flushBufferedAuditEntries,
  mergeAuditFeeds,
} from './audit/clientLogger';
export type { AuditBufferRecord } from './audit/types';
