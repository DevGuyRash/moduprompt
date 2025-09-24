import { normalizeNewlines } from './text';

const countMaxFence = (input: string): number => {
  const normalized = normalizeNewlines(input);
  const pattern = /`{3,}/g;
  let match: RegExpExecArray | null;
  let max = 0;
  while ((match = pattern.exec(normalized)) != null) {
    const length = match[0]?.length ?? 0;
    if (length > max) {
      max = length;
    }
  }
  return max;
};

export const wrapWithSmartFence = (content: string, language?: string): string => {
  const maxFence = countMaxFence(content);
  const fenceLength = Math.max(3, maxFence + 1);
  const fence = '`'.repeat(fenceLength);
  const header = language ? `${fence}${language}` : fence;
  return `${header}\n${content}\n${fence}`;
};
