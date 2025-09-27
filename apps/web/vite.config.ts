import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, ['MODUPROMPT_', 'VITE_']);

  const basePath = env.MODUPROMPT_PUBLIC_BASE ?? '/';

  return {
    root: rootDir,
    publicDir: 'public',
    envPrefix: ['MODUPROMPT_', 'VITE_'],
    plugins: [react()],
    resolve: {
      alias: {
        '@app': path.resolve(rootDir, 'src'),
        '@modules': path.resolve(rootDir, 'src/modules'),
        '@state': path.resolve(rootDir, 'src/state'),
        '@types': path.resolve(rootDir, 'src/types'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.MODUPROMPT_DEV_SERVER_PORT ?? 5173),
      open: false,
    },
    preview: {
      host: '0.0.0.0',
      port: Number(env.MODUPROMPT_PREVIEW_PORT ?? 4173),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      manifest: true,
      sourcemap: true,
      cssCodeSplit: true,
      rollupOptions: {
        input: path.resolve(rootDir, 'index.html'),
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    base: basePath,
  };
});
