import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        statements: 0.78,
        branches: 0.6,
        functions: 0.72,
        lines: 0.78,
      },
    },
  },
  resolve: {
    alias: {
      marked: resolve(rootDir, 'test/stubs/marked.ts'),
      'sanitize-html': resolve(rootDir, 'test/stubs/sanitize-html.ts'),
    },
  },
});
