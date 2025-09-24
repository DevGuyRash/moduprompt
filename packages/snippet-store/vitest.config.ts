import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        statements: 0.8,
        branches: 0.65,
        functions: 0.75,
        lines: 0.8,
      },
    },
  },
});
