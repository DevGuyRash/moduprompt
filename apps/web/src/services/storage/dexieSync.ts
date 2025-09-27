import type { WorkspaceStore } from '@moduprompt/snippet-store';
import { importWorkspaceBackup, writeTextFile } from '@moduprompt/snippet-store';
import type { DirectoryHandle } from '@moduprompt/snippet-store/opfs/types';
import type { WorkspaceLogger } from '../workspace/workspaceOrchestrator.js';

export interface DexieSyncOptions {
  workspaceStore: WorkspaceStore;
  logger?: WorkspaceLogger;
  backupPath?: string | string[];
  backupIntervalMs?: number;
}

const DEFAULT_BACKUP_PATH = ['moduprompt', 'workspace-backup.json'];
const DEFAULT_BACKUP_INTERVAL_MS = 5 * 60 * 1000;

const resolveBackupPath = (path?: string | string[]): string[] => {
  if (!path) {
    return [...DEFAULT_BACKUP_PATH];
  }
  if (Array.isArray(path)) {
    return [...path];
  }
  return path.split('/').filter(Boolean);
};

const encodeSnapshot = (snapshot: unknown): { payload: string; size: number } => {
  const payload = JSON.stringify(snapshot, null, 2);
  const size = typeof Blob === 'function' ? new Blob([payload]).size : payload.length;
  return { payload, size };
};

export class DexieSyncService {
  private readonly workspaceStore: WorkspaceStore;
  private readonly logger?: WorkspaceLogger;
  private readonly backupPath: string[];
  private readonly backupIntervalMs: number;
  private opfsRoot?: DirectoryHandle;
  private backupTimer: ReturnType<typeof setTimeout> | null = null;
  private initializing = false;

  constructor(options: DexieSyncOptions) {
    this.workspaceStore = options.workspaceStore;
    this.logger = options.logger;
    this.backupPath = resolveBackupPath(options.backupPath);
    this.backupIntervalMs = options.backupIntervalMs ?? DEFAULT_BACKUP_INTERVAL_MS;
  }

  async initialize(): Promise<void> {
    if (this.initializing || this.opfsRoot) {
      return;
    }
    this.initializing = true;
    try {
      if (
        typeof navigator === 'undefined' ||
        !('storage' in navigator) ||
        typeof navigator.storage.getDirectory !== 'function'
      ) {
        this.log('info', 'OPFS directory handle unavailable; skipping Dexie sync setup.');
        return;
      }

      this.opfsRoot = await navigator.storage.getDirectory();
      if (typeof navigator.storage.persist === 'function') {
        try {
          await navigator.storage.persist();
        } catch (error) {
          this.log('warn', 'Failed to request persistent storage', { error });
        }
      }
    } finally {
      this.initializing = false;
    }
  }

  async restoreIfEmpty(): Promise<boolean> {
    if (!this.opfsRoot) {
      return false;
    }

    const documents = await this.workspaceStore.listDocuments();
    if (documents.length > 0) {
      return false;
    }

    try {
      const snapshot = await importWorkspaceBackup(this.workspaceStore, this.opfsRoot, {
        path: this.backupPath,
      });
      if (snapshot) {
        this.log('info', 'Restored workspace from OPFS backup', {
          schemaVersion: snapshot.schemaVersion,
        });
        return true;
      }
    } catch (error) {
      this.log('error', 'Failed to restore workspace backup', { error });
    }
    return false;
  }

  async backupNow(): Promise<boolean> {
    if (!this.opfsRoot) {
      return false;
    }

    try {
      const snapshot = await this.workspaceStore.exportSnapshot();
      const { payload, size } = encodeSnapshot(snapshot);
      if (!(await this.ensureQuota(size))) {
        return false;
      }
      await writeTextFile(this.opfsRoot, this.backupPath, payload);
      this.log('info', 'Persisted workspace snapshot to OPFS', {
        schemaVersion: snapshot.schemaVersion,
        bytes: size,
      });
      await this.registerBackgroundSync();
      return true;
    } catch (error) {
      this.log('error', 'Failed to persist workspace snapshot', { error });
      return false;
    }
  }

  startAutoBackup(): void {
    this.stopAutoBackup();
    if (!Number.isFinite(this.backupIntervalMs) || this.backupIntervalMs <= 0) {
      return;
    }

    const tick = async (): Promise<void> => {
      await this.backupNow();
      this.backupTimer = setTimeout(tick, this.backupIntervalMs);
    };

    this.backupTimer = setTimeout(tick, this.backupIntervalMs);
  }

  stopAutoBackup(): void {
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
      this.backupTimer = null;
    }
  }

  dispose(): void {
    this.stopAutoBackup();
  }

  handleServiceWorkerMessage(message: unknown): void {
    if (!message || typeof message !== 'object') {
      return;
    }
    const payload = message as { type?: string };
    if (payload.type === 'SYNC_REQUEST') {
      void this.backupNow();
    }
  }

  private async registerBackgroundSync(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await registration.sync.register('moduprompt-sync');
        this.log('info', 'Background sync registered');
      }
    } catch (error) {
      this.log('warn', 'Unable to register background sync', { error });
    }
  }

  private async ensureQuota(bytesRequired: number): Promise<boolean> {
    if (
      typeof navigator === 'undefined' ||
      !('storage' in navigator) ||
      typeof navigator.storage.estimate !== 'function'
    ) {
      return true;
    }

    try {
      const { quota = 0, usage = 0 } = await navigator.storage.estimate();
      if (!quota) {
        return true;
      }
      const available = quota - usage;
      if (available < bytesRequired) {
        this.log('warn', 'Insufficient storage quota for workspace backup', {
          quota,
          usage,
          bytesRequired,
        });
        return false;
      }
      return true;
    } catch (error) {
      this.log('warn', 'Unable to estimate storage quota; proceeding with backup', { error });
      return true;
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
    this.logger?.(level, message, context);
  }
}
