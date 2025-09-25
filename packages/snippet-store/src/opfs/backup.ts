import { writeTextFile, readTextFile } from './workspaceFs.js';
import type { DirectoryHandle } from './types.js';
import type { WorkspaceSnapshot, WorkspaceStore } from '../dexie/workspaceStore.js';

export interface BackupOptions {
  path?: string | string[];
}

const DEFAULT_BACKUP_PATH = ['moduprompt', 'workspace-backup.json'];

const resolvePath = (options?: BackupOptions): string[] => {
  if (!options?.path) {
    return [...DEFAULT_BACKUP_PATH];
  }
  if (Array.isArray(options.path)) {
    return [...options.path];
  }
  return options.path.split('/').filter(Boolean);
};

export const exportWorkspaceBackup = async (
  store: WorkspaceStore,
  root: DirectoryHandle,
  options?: BackupOptions,
): Promise<WorkspaceSnapshot> => {
  const snapshot = await store.exportSnapshot();
  const path = resolvePath(options);
  await writeTextFile(root, path, JSON.stringify(snapshot, null, 2));
  return snapshot;
};

export const importWorkspaceBackup = async (
  store: WorkspaceStore,
  root: DirectoryHandle,
  options?: BackupOptions,
): Promise<WorkspaceSnapshot | null> => {
  const path = resolvePath(options);
  const contents = await readTextFile(root, path);
  if (!contents) {
    return null;
  }
  const snapshot = JSON.parse(contents) as WorkspaceSnapshot;
  await store.importSnapshot(snapshot);
  return snapshot;
};
