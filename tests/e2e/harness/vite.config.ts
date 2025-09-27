import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoRoot = path.resolve(__dirname, '../..', '..');

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@moduprompt/web': path.resolve(repoRoot, 'apps/web/src'),
      '@moduprompt/compiler': path.resolve(repoRoot, 'packages/compiler/src'),
      '@moduprompt/compiler/server/export': path.resolve(__dirname, 'src/stubs/compilerServerExport.ts'),
      '@moduprompt/snippet-store': path.resolve(repoRoot, 'packages/snippet-store/src'),
      '@moduprompt/types': path.resolve(repoRoot, 'packages/types/src'),
      '@moduprompt/api/modules/documents/contracts.js': path.resolve(repoRoot, 'apps/web/src/test/stubs/documentsContracts.ts'),
      '@moduprompt/api/modules/snippets/contracts.js': path.resolve(repoRoot, 'apps/web/src/test/stubs/snippetsContracts.ts'),
      '@fixtures': path.resolve(repoRoot, 'tests/e2e/fixtures'),
      'node:crypto': path.resolve(__dirname, 'src/stubs/crypto.ts'),
    },
  },
  server: {
    port: 4173,
    host: '127.0.0.1',
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
