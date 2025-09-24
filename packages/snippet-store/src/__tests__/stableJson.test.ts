import { describe, expect, it } from 'vitest';
import { stableStringify } from '../internal/stableJson';

describe('stableStringify', () => {
  it('produces deterministic output regardless of key insertion order', () => {
    const inputA = {
      name: 'Example',
      metadata: {
        version: 2,
        tags: ['Draft', 'Ready'],
      },
      flags: {
        enabled: true,
        deprecated: false,
      },
    };

    const inputB = {
      flags: {
        deprecated: false,
        enabled: true,
      },
      metadata: {
        tags: ['Draft', 'Ready'],
        version: 2,
      },
      name: 'Example',
    };

    expect(stableStringify(inputA)).toBe(stableStringify(inputB));
  });

  it('omits undefined properties while preserving nested array ordering', () => {
    const input = {
      title: 'Deterministic',
      description: undefined,
      steps: [
        { id: 2, label: 'Second', optional: undefined },
        { id: 1, label: 'First' },
      ],
    };

    expect(stableStringify(input)).toBe('{"steps":[{"id":2,"label":"Second"},{"id":1,"label":"First"}],"title":"Deterministic"}');
  });
});
