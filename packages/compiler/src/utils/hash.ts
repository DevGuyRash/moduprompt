import { sha256 } from '@noble/hashes/sha256';

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const computeHash = (input: string): string => {
  const digest = sha256(encoder.encode(input));
  return toHex(digest);
};
