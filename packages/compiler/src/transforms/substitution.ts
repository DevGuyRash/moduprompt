const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export const substituteVariables = (input: string, variables: Record<string, string>): { result: string; missing: string[] } => {
  const missing = new Set<string>();
  const result = input.replace(VARIABLE_PATTERN, (match, identifier: string) => {
    if (identifier.startsWith('>')) {
      return match;
    }
    if (Object.prototype.hasOwnProperty.call(variables, identifier)) {
      return variables[identifier] ?? '';
    }
    missing.add(identifier);
    return match;
  });
  return { result, missing: Array.from(missing).sort() };
};
