import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '..', '..');
const harnessBaseUrl = 'http://127.0.0.1:4173';
const dockerBaseUrl = process.env.DOCKER_SMOKE_BASE_URL || 'http://127.0.0.1:8080';
const harnessWebServer = {
  command: 'pnpm exec vite dev --config tests/e2e/harness/vite.config.ts --host 127.0.0.1 --port 4173',
  cwd: repoRoot,
  reuseExistingServer: !process.env.CI,
  port: 4173,
  stdout: 'pipe',
  stderr: 'pipe',
};

export default defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { outputFolder: path.resolve(repoRoot, 'playwright-report') }]] : 'list',
  outputDir: path.resolve(repoRoot, '.playwright-artifacts'),
  projects: [
    {
      name: 'journeys',
      testDir: path.resolve(__dirname, 'moduprompt'),
      use: {
        ...devices['Desktop Chrome'],
        baseURL: harnessBaseUrl,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      webServer: harnessWebServer,
    },
    {
      name: 'accessibility',
      testDir: path.resolve(__dirname, '../a11y'),
      use: {
        ...devices['Desktop Chrome'],
        baseURL: harnessBaseUrl,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      webServer: harnessWebServer,
    },
    {
      name: 'docker-smoke',
      testDir: path.resolve(__dirname, 'docker'),
      use: {
        ...devices['Desktop Chrome'],
        baseURL: dockerBaseUrl,
        trace: 'off',
        screenshot: 'off',
        video: 'off',
      },
    },
  ],
});
