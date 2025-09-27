import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import type { SnippetVersion } from '@moduprompt/types';
import { stableStringify } from './stableJson.js';

const encoder = new TextEncoder();

const bufferToHex = (buffer: ArrayBuffer): string => bytesToHex(new Uint8Array(buffer));

const nobleDigest = (payload: Uint8Array): string => {
  const digest = sha256(payload);
  return bytesToHex(digest);
};

export const computeSha256Hex = async (payload: string): Promise<string> => {
  const encoded = encoder.encode(payload);
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return bufferToHex(digest);
  }
  return nobleDigest(encoded);
};

export const computeIntegrityHash = async (
  body: string,
  frontmatter: SnippetVersion['frontmatter'],
): Promise<string> => {
  const serializedFrontmatter = stableStringify(frontmatter);
  return computeSha256Hex(`${body}\n---\n${serializedFrontmatter}`);
};

export const verifySnippetIntegrity = async (version: SnippetVersion): Promise<void> => {
  const expectedHash = await computeIntegrityHash(version.body, version.frontmatter);
  if (expectedHash !== version.hash) {
    throw new Error(
      `Snippet version integrity mismatch for ${version.snippetId}@${version.rev}: expected ${expectedHash}, received ${version.hash}`,
    );
  }
};
