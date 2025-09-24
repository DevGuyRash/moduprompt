import type { DirectoryHandle, FileHandle, WritableFileStream } from './types.js';

const toSegments = (path: string | string[]): string[] => {
  if (Array.isArray(path)) return [...path];
  return path.split('/').filter((segment) => segment.length > 0);
};

const isNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'NotFoundError';

const traverseDirectories = async (
  root: DirectoryHandle,
  segments: string[],
  { create }: { create: boolean },
): Promise<DirectoryHandle | null> => {
  let current: DirectoryHandle = root;
  for (const segment of segments) {
    try {
      current = await current.getDirectoryHandle(segment, { create });
    } catch (error) {
      if (!create && isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }
  return current;
};

const writeWithHandle = async (
  handle: FileHandle,
  writer: (stream: WritableFileStream) => Promise<void>,
): Promise<void> => {
  const writable = await handle.createWritable();
  try {
    await writer(writable);
  } finally {
    await writable.close();
  }
};

export const writeTextFile = async (
  root: DirectoryHandle,
  path: string | string[],
  contents: string,
): Promise<void> => {
  const segments = toSegments(path);
  if (segments.length === 0) {
    throw new Error('Path must contain at least one segment');
  }
  const fileName = segments.pop()!;
  const directory = await traverseDirectories(root, segments, { create: true });
  if (!directory) {
    throw new Error('Failed to create directory for path');
  }
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  await writeWithHandle(fileHandle, async (stream) => {
    await stream.write(contents);
  });
};

export const writeBinaryFile = async (
  root: DirectoryHandle,
  path: string | string[],
  data: ArrayBuffer | ArrayBufferView,
): Promise<void> => {
  const segments = toSegments(path);
  if (segments.length === 0) {
    throw new Error('Path must contain at least one segment');
  }
  const fileName = segments.pop()!;
  const directory = await traverseDirectories(root, segments, { create: true });
  if (!directory) {
    throw new Error('Failed to create directory for path');
  }
  const fileHandle = await directory.getFileHandle(fileName, { create: true });
  await writeWithHandle(fileHandle, async (stream) => {
    await stream.write(data);
  });
};

export const readTextFile = async (
  root: DirectoryHandle,
  path: string | string[],
): Promise<string | undefined> => {
  const segments = toSegments(path);
  if (segments.length === 0) return undefined;
  const fileName = segments.pop()!;
  const directory = await traverseDirectories(root, segments, { create: false });
  if (!directory) return undefined;
  try {
    const fileHandle = await directory.getFileHandle(fileName, { create: false });
    const file = await fileHandle.getFile();
    return file.text();
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

export const removeEntry = async (
  root: DirectoryHandle,
  path: string | string[],
  options: { recursive?: boolean } = {},
): Promise<void> => {
  const segments = toSegments(path);
  if (segments.length === 0) return;
  const name = segments.pop()!;
  const directory = await traverseDirectories(root, segments, { create: false });
  if (!directory) return;
  try {
    await directory.removeEntry(name, options);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }
};
