export type DiffSegmentType = 'context' | 'added' | 'removed';

export interface DiffSegment {
  type: DiffSegmentType;
  value: string;
}

const splitLines = (input: string): string[] => input.replace(/\r\n/g, '\n').split('\n');

export const computeDiff = (previous: string, next: string): DiffSegment[] => {
  const a = splitLines(previous);
  const b = splitLines(next);
  const rows = a.length;
  const cols = b.length;

  const table: number[][] = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        table[i][j] = table[i + 1][j + 1] + 1;
      } else {
        table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  const push = (type: DiffSegmentType, value: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) {
      last.value += `\n${value}`;
      return;
    }
    segments.push({ type, value });
  };

  while (i < rows && j < cols) {
    if (a[i] === b[j]) {
      push('context', a[i]!);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push('removed', a[i]!);
      i += 1;
    } else {
      push('added', b[j]!);
      j += 1;
    }
  }

  while (i < rows) {
    push('removed', a[i]!);
    i += 1;
  }
  while (j < cols) {
    push('added', b[j]!);
    j += 1;
  }

  return segments;
};
