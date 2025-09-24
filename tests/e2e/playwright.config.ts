import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { outputFolder: path.resolve(repoRoot, 'playwright-report') }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite dev --config tests/e2e/harness/vite.config.ts --host 127.0.0.1 --port 4173',
    cwd: repoRoot,
    reuseExistingServer: !process.env.CI,
    port: 4173,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'journeys',
      testDir: path.resolve(__dirname, 'moduprompt'),
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'accessibility',
      testDir: path.resolve(__dirname, '../a11y'),
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: path.resolve(repoRoot, '.playwright-artifacts'),
});
