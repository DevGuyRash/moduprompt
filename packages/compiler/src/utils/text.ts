export const normalizeNewlines = (input: string): string => input.replace(/\r\n?/g, '\n');

export const trimTrailingWhitespace = (input: string): string => input.replace(/[ \t]+$/gm, '');

export const ensureTerminalNewline = (input: string, newline: string): string => {
  if (input.endsWith(newline)) {
    return input;
  }
  if (input.length === 0) {
    return newline;
  }
  return `${input}${newline}`;
};

export const markdownToText = (input: string): string => {
  const withoutCodeFences = input.replace(/```[\s\S]*?```/g, (match) =>
    match
      .replace(/```.*\n?/g, '')
      .replace(/```/g, ''),
  );
  const withoutInlineCode = withoutCodeFences.replace(/`([^`]+)`/g, '$1');
  const withoutLinks = withoutInlineCode.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  const withoutFormatting = withoutLinks
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1');
  const withoutLists = withoutFormatting.replace(/^\s*[-*+]\s+/gm, '').replace(/^\s*\d+\.\s+/gm, '');
  return withoutLists.replace(/\s+/g, ' ').trim();
};

export const collectPlaceholders = (input: string): Set<string> => {
  const placeholders = new Set<string>();
  const pattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) != null) {
    const token = match[1];
    if (typeof token === 'string' && !token.startsWith('>')) {
      placeholders.add(token);
    }
  }
  return placeholders;
};

export interface FenceIssue {
  fence: string;
  line: number;
}

export const findUnbalancedFences = (input: string): FenceIssue[] => {
  const issues: FenceIssue[] = [];
  const lines = normalizeNewlines(input).split('\n');
  const stack: { fence: string; line: number }[] = [];
  const fencePattern = /^(`{3,})(.*)$/;

  lines.forEach((line, index) => {
    const match = fencePattern.exec(line.trimEnd());
    if (!match) {
      return;
    }
    const fence = match[1] ?? '```';
    const top = stack[stack.length - 1];
    if (top && top.fence === fence) {
      stack.pop();
    } else {
      stack.push({ fence, line: index + 1 });
    }
  });

  while (stack.length > 0) {
    const next = stack.pop();
    if (next) {
      issues.push({ fence: next.fence, line: next.line });
    }
  }

  return issues;
};
