import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import type { SnippetVersion } from '@moduprompt/types';
import { stableStringify } from './stableJson';

const encoder = new TextEncoder();

const bufferToHex = (buffer: ArrayBuffer): string => bytesToHex(new Uint8Array(buffer));

const nobleDigest = (payload: Uint8Array): string => {
  const digest = sha256(payload);
  return bytesToHex(digest);
};

export const computeIntegrityHash = async (
  body: string,
  frontmatter: SnippetVersion['frontmatter'],
): Promise<string> => {
  const serializedFrontmatter = stableStringify(frontmatter);
  const payload = encoder.encode(`${body}\n---\n${serializedFrontmatter}`);

  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', payload);
    return bufferToHex(digest);
  }

  // Fallback to pure JS implementation to support non-secure contexts (e.g., unit tests).
  return nobleDigest(payload);
};

export const verifySnippetIntegrity = async (version: SnippetVersion): Promise<void> => {
  const expectedHash = await computeIntegrityHash(version.body, version.frontmatter);
  if (expectedHash !== version.hash) {
    throw new Error(
      `Snippet version integrity mismatch for ${version.snippetId}@${version.rev}: expected ${expectedHash}, received ${version.hash}`,
    );
  }
};
