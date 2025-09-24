import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 0.75,
        branches: 0.6,
        functions: 0.7,
        lines: 0.75,
      },
    },
    setupFiles: ['tests/setup.ts'],
  },
});
