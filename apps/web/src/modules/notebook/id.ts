let counter = 0;

export const generateId = (prefix: string): string => {
  counter += 1;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // ignore and fall back to deterministic id
    }
  }
  return `${prefix}-${Date.now()}-${counter}`;
};

export const resetIdCounter = (): void => {
  counter = 0;
};
