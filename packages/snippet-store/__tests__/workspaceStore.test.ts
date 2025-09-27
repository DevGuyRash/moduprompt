import { describe, expect, it, beforeEach } from 'vitest';
import type { DocumentModel, Snippet, SnippetVersion, WorkspaceStatus, ExportRecipe } from '@moduprompt/types';
import {
  WorkspaceStore,
  exportWorkspaceBackup,
  importWorkspaceBackup,
  computeIntegrityHash,
  writeTextFile,
  readTextFile,
  writeBinaryFile,
  removeEntry,
} from '../src/index.js';
import { WORKSPACE_MIGRATIONS } from '../migrations/workspace.js';
import type { DirectoryHandle, FileHandle, WritableFileStream } from '../src/opfs/types.js';

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class MemoryFile implements FileHandle['getFile'], WritableFileStream {
  private buffer = new Uint8Array();

  async write(data: Blob | ArrayBuffer | ArrayBufferView | string): Promise<void> {
    if (typeof data === 'string') {
      this.buffer = new TextEncoder().encode(data);
      return;
    }
    if (data instanceof ArrayBuffer) {
      this.buffer = new Uint8Array(data);
      return;
    }
    if (ArrayBuffer.isView(data)) {
      this.buffer = new Uint8Array(data.buffer.slice(0));
      return;
    }
    const text = await (data as Blob).text();
    this.buffer = new TextEncoder().encode(text);
  }

  async close(): Promise<void> {}

  async text(): Promise<string> {
    return new TextDecoder().decode(this.buffer);
  }
}

class MemoryFileHandle implements FileHandle {
  constructor(private readonly file: MemoryFile) {}

  async createWritable(): Promise<WritableFileStream> {
    return this.file;
  }

  async getFile(): Promise<MemoryFile> {
    return this.file;
  }
}

class MemoryDirectoryHandle implements DirectoryHandle {
  private readonly directories = new Map<string, MemoryDirectoryHandle>();
  private readonly files = new Map<string, MemoryFileHandle>();

  constructor(private readonly name: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean | undefined }): Promise<DirectoryHandle> {
    const existing = this.directories.get(name);
    if (existing) return existing;
    if (options?.create) {
      const directory = new MemoryDirectoryHandle(name);
      this.directories.set(name, directory);
      return directory;
    }
    throw new NotFoundError(`Directory ${name} not found under ${this.name}`);
  }

  async getFileHandle(name: string, options?: { create?: boolean | undefined }): Promise<FileHandle> {
    const existing = this.files.get(name);
    if (existing) return existing;
    if (options?.create) {
      const file = new MemoryFile();
      const handle = new MemoryFileHandle(file);
      this.files.set(name, handle);
      return handle;
    }
    throw new NotFoundError(`File ${name} not found under ${this.name}`);
  }

  async removeEntry(name: string, options?: { recursive?: boolean | undefined }): Promise<void> {
    if (this.files.delete(name)) {
      return;
    }
    const directory = this.directories.get(name);
    if (directory) {
      if (options?.recursive || (directory.files.size === 0 && directory.directories.size === 0)) {
        this.directories.delete(name);
        return;
      }
      throw new Error(`Directory ${name} is not empty`);
    }
    throw new NotFoundError(`Entry ${name} not found for removal`);
  }
}

const createStore = () => new WorkspaceStore({ dbName: `test-${Math.random()}` });

let store: WorkspaceStore;
let opfsRoot: MemoryDirectoryHandle;

beforeEach(async () => {
  store = createStore();
  opfsRoot = new MemoryDirectoryHandle('root');
  await store.clear();
});

const sampleStatuses: WorkspaceStatus[] = [
  { key: 'draft', name: 'Draft', color: '#cccccc', order: 1 },
  { key: 'approved', name: 'Approved', color: '#00ff00', order: 2 },
];

const sampleRecipes: ExportRecipe[] = [
  {
    id: 'default',
    name: 'Markdown',
    type: 'markdown',
    include: { all: true },
    allowedStatuses: ['approved'],
    theme: 'default',
    pdf: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const createDocument = (): DocumentModel => ({
  id: 'doc-1',
  title: 'Demo',
  schemaVersion: 2,
  blocks: [],
  edges: [],
  variables: [],
  exportRecipes: [],
  tags: ['Draft'],
  statusKey: 'draft',
  settings: { maxWidth: '96ch' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const createSnippet = (): Snippet => ({
  id: 'snippet-1',
  title: 'Greeting',
  path: 'general/greeting',
  frontmatter: {
    schemaVersion: 1,
    tags: ['Greeting'],
  },
  body: 'Hello, world!',
  headRev: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe('WorkspaceStore', () => {
  it('registers migrations in deterministic order', () => {
    const versions = WORKSPACE_MIGRATIONS.map((migration) => migration.version);
    const sorted = [...versions].sort((a, b) => a - b);
    expect(versions).toEqual(sorted);
  });

  it('persists and retrieves documents with normalized tags', async () => {
    const document = createDocument();
    document.tags = ['Draft', 'draft'];
    await store.upsertDocument(document);

    const stored = await store.getDocument(document.id);
    expect(stored?.tags).toEqual(['draft']);

    const all = await store.listDocuments();
    expect(all).toHaveLength(1);
  });

  it('enforces snippet version integrity hashes', async () => {
    const snippet = createSnippet();
    await store.upsertSnippet(snippet);

    const goodVersion: SnippetVersion = {
      snippetId: snippet.id,
      rev: 1,
      parentRev: 0,
      body: 'Hello, ModuPrompt!',
      frontmatter: snippet.frontmatter,
      timestamp: Date.now(),
      note: 'Initial',
      hash: await computeIntegrityHash('Hello, ModuPrompt!', snippet.frontmatter),
    };

    await store.putSnippetVersion(goodVersion);

    const updatedSnippet = await store.getSnippet(snippet.id);
    expect(updatedSnippet?.headRev).toBe(1);

    const badVersion: SnippetVersion = {
      ...goodVersion,
      rev: 2,
      timestamp: Date.now() + 1_000,
      hash: 'deadbeef',
    };

    await expect(store.putSnippetVersion(badVersion)).rejects.toThrow(/integrity mismatch/);
  });

  it('imports and exports snapshots losslessly', async () => {
    const document = createDocument();
    const snippet = createSnippet();
    const version: SnippetVersion = {
      snippetId: snippet.id,
      rev: 1,
      parentRev: 0,
      body: snippet.body,
      frontmatter: snippet.frontmatter,
      timestamp: Date.now(),
      hash: await computeIntegrityHash(snippet.body, snippet.frontmatter),
    };

    await Promise.all([
      store.upsertDocument(document),
      store.upsertSnippet(snippet),
    ]);
    await store.putSnippetVersion(version);
    await store.saveWorkspaceSettings({
      statuses: sampleStatuses,
      exportRecipes: sampleRecipes,
      schemaVersion: 1,
      updatedAt: Date.now(),
      lastExportedAt: Date.now(),
    });

    const snapshot = await store.exportSnapshot();
    expect(snapshot.schemaVersion).toBeGreaterThan(0);
    expect(snapshot.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    await store.clear();
    await store.importSnapshot(snapshot);

    expect(await store.listDocuments()).toHaveLength(1);
    expect((await store.listSnippets())[0].headRev).toBe(1);
    expect((await store.listSnippetVersions(snippet.id)).length).toBe(1);
    const settings = await store.getWorkspaceSettings();
    expect(settings?.schemaVersion).toBe(Math.trunc(store.database.verno));
  });

  it('applies schema upgrades and buffers migration audits', async () => {
    const dbName = `legacy-${Math.random()}`;
    const legacyStore = new WorkspaceStore({
      dbName,
      migrations: WORKSPACE_MIGRATIONS.slice(0, 2),
    });

    await legacyStore.saveWorkspaceSettings({
      statuses: sampleStatuses,
      exportRecipes: sampleRecipes,
      schemaVersion: 2,
      updatedAt: Date.now(),
      lastExportedAt: undefined,
    });

    await legacyStore.close();

    const upgradedStore = new WorkspaceStore({ dbName });
    await upgradedStore.listDocuments();

    const settings = await upgradedStore.getWorkspaceSettings();
    const latestVersion = WORKSPACE_MIGRATIONS[WORKSPACE_MIGRATIONS.length - 1]!.version;
    expect(settings?.schemaVersion).toBe(latestVersion);

    const auditRecords = await upgradedStore.database.auditBuffer.toArray();
    expect(auditRecords.some((record) => record.entry.type === 'workspace.migration.applied')).toBe(true);

    await upgradedStore.close();
  });
});

describe('OPFS backup utilities', () => {
  it('writes and reads workspace backup payloads', async () => {
    const document = createDocument();
    const snippet = createSnippet();
    const hash = await computeIntegrityHash(snippet.body, snippet.frontmatter);
    await store.upsertDocument(document);
    await store.upsertSnippet(snippet);
    await store.putSnippetVersion({
      snippetId: snippet.id,
      rev: 1,
      parentRev: 0,
      body: snippet.body,
      frontmatter: snippet.frontmatter,
      timestamp: Date.now(),
      hash,
    });

    await exportWorkspaceBackup(store, opfsRoot);
    const contents = await readTextFile(opfsRoot, ['moduprompt', 'workspace-backup.json']);
    expect(contents).toBeTruthy();
    const serialized = JSON.parse(contents!);
    expect(serialized.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(serialized.schemaVersion).toBeGreaterThan(0);

    await store.clear();
    const snapshot = await importWorkspaceBackup(store, opfsRoot);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.integrityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await store.listDocuments()).toHaveLength(1);
  });

  it('supports custom backup paths and binary asset writes', async () => {
    await exportWorkspaceBackup(store, opfsRoot, { path: 'backups/custom.json' });
    await writeBinaryFile(opfsRoot, ['assets', 'image.bin'], new Uint8Array([1, 2, 3]));

    const backup = await readTextFile(opfsRoot, 'backups/custom.json');
    expect(backup).toBeTruthy();

    await removeEntry(opfsRoot, 'backups/custom.json');
    await removeEntry(opfsRoot, 'assets/image.bin');
    const missing = await readTextFile(opfsRoot, 'backups/custom.json');
    expect(missing).toBeUndefined();
  });

  it('returns null when backup is not present', async () => {
    const result = await importWorkspaceBackup(store, opfsRoot, { path: 'missing.json' });
    expect(result).toBeNull();
  });
});
