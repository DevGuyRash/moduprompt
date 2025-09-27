import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const snippetStoreMocks = vi.hoisted(() => ({
  importWorkspaceBackup: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock('@moduprompt/snippet-store', () => ({
  __esModule: true,
  importWorkspaceBackup: snippetStoreMocks.importWorkspaceBackup,
  writeTextFile: snippetStoreMocks.writeTextFile,
}));

import type { WorkspaceStore } from '@moduprompt/snippet-store';
import { DexieSyncService } from '../dexieSync.js';
import { importWorkspaceBackup, writeTextFile } from '@moduprompt/snippet-store';

type MockedStorage = {
  getDirectory: vi.Mock;
  persist: vi.Mock;
  estimate: vi.Mock;
};

type MockedServiceWorker = {
  ready: Promise<{
    sync: {
      register: vi.Mock;
    };
  }>;
};

const originalStorage = navigator.storage;
const originalServiceWorker = navigator.serviceWorker;

const createWorkspaceStore = (): WorkspaceStore => {
  return {
    listDocuments: vi.fn().mockResolvedValue([]),
    exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 1, documents: [] }),
  } as unknown as WorkspaceStore;
};

describe('DexieSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        getDirectory: vi.fn().mockResolvedValue({}),
        persist: vi.fn().mockResolvedValue(true),
        estimate: vi.fn().mockResolvedValue({ quota: 1024 * 1024, usage: 8_192 }),
      } satisfies MockedStorage,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          sync: {
            register: vi.fn().mockResolvedValue(undefined),
          },
        }),
      } satisfies MockedServiceWorker,
    });

    snippetStoreMocks.importWorkspaceBackup.mockReset();
    snippetStoreMocks.writeTextFile.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  it('requests OPFS directory and persistent storage when supported', async () => {
    const workspaceStore = createWorkspaceStore();
    const logger = vi.fn();
    const service = new DexieSyncService({ workspaceStore, logger });

    await service.initialize();

    const storage = navigator.storage as unknown as MockedStorage;
    expect(storage.getDirectory).toHaveBeenCalledTimes(1);
    expect(storage.persist).toHaveBeenCalledTimes(1);
    expect(logger).not.toHaveBeenCalledWith('error', expect.any(String), expect.anything());
  });

  it('restores workspace snapshot when store is empty and backup is available', async () => {
    const workspaceStore = createWorkspaceStore();
    const logger = vi.fn();
    const service = new DexieSyncService({ workspaceStore, logger });

    const directoryHandle = { id: 'opfs-root' };
    (navigator.storage as unknown as MockedStorage).getDirectory.mockResolvedValue(directoryHandle);
    snippetStoreMocks.importWorkspaceBackup.mockResolvedValue({ schemaVersion: 3 });

    await service.initialize();

    const restored = await service.restoreIfEmpty();

    expect(restored).toBe(true);
    expect(importWorkspaceBackup).toHaveBeenCalledWith(workspaceStore, directoryHandle, {
      path: ['moduprompt', 'workspace-backup.json'],
    });
    expect(logger).toHaveBeenCalledWith('info', 'Restored workspace from OPFS backup', {
      schemaVersion: 3,
    });
  });

  it('backs up workspace snapshot to OPFS and registers background sync', async () => {
    const workspaceStore = createWorkspaceStore();
    const logger = vi.fn();
    const service = new DexieSyncService({ workspaceStore, logger });

    const directoryHandle = { id: 'opfs-root' };
    const storage = navigator.storage as unknown as MockedStorage;
    storage.getDirectory.mockResolvedValue(directoryHandle);
    storage.estimate.mockResolvedValue({ quota: 10_485_760, usage: 65_536 });

    const registerMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          sync: {
            register: registerMock,
          },
        }),
      } satisfies MockedServiceWorker,
    });

    await service.initialize();

    const success = await service.backupNow();

    expect(success).toBe(true);
    expect(writeTextFile).toHaveBeenCalledWith(
      directoryHandle,
      ['moduprompt', 'workspace-backup.json'],
      expect.stringContaining('schemaVersion'),
    );
    expect(registerMock).toHaveBeenCalledWith('moduprompt-sync');
    expect(logger).toHaveBeenCalledWith('info', 'Persisted workspace snapshot to OPFS', expect.any(Object));
  });
});
