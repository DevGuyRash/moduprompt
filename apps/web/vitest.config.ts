import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const fromRoot = (relative: string) => path.resolve(rootDir, relative);

export default defineConfig({
  resolve: {
    alias: [
      { find: '@moduprompt/compiler', replacement: fromRoot('../../packages/compiler/src/index.ts') },
      { find: '@moduprompt/compiler/', replacement: fromRoot('../../packages/compiler/src/') },
      { find: '@moduprompt/snippet-store', replacement: fromRoot('../../packages/snippet-store/src/index.ts') },
      { find: '@moduprompt/snippet-store/', replacement: fromRoot('../../packages/snippet-store/src/') },
      { find: '@moduprompt/types', replacement: fromRoot('../../packages/types/src/index.ts') },
      { find: '@moduprompt/types/', replacement: fromRoot('../../packages/types/src/') },
      {
        find: '@moduprompt/api/modules/documents/contracts.js',
        replacement: fromRoot('src/test/stubs/documentsContracts.ts'),
      },
      {
        find: '@moduprompt/api/modules/snippets/contracts.js',
        replacement: fromRoot('src/test/stubs/snippetsContracts.ts'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
