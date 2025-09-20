import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json-summary', 'lcov'],
    },
  },
});
