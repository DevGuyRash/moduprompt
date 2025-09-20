export interface FileLike {
  text(): Promise<string>;
}

export interface WritableFileStream {
  write(data: Blob | ArrayBufferView | ArrayBuffer | string): Promise<void>;
  close(): Promise<void>;
}

export interface FileHandle {
  createWritable(options?: { keepExistingData?: boolean }): Promise<WritableFileStream>;
  getFile(): Promise<FileLike>;
}

export interface DirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

export const isDirectoryHandle = (value: unknown): value is DirectoryHandle =>
  typeof value === 'object' && value !== null && 'getDirectoryHandle' in value && 'getFileHandle' in value;
