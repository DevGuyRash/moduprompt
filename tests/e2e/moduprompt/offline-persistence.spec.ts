import { expect } from '@playwright/test';
import { test } from '../fixtures/test';

declare global {
  interface Window {
    __HARNESS__?: {
      exportWorkspaceSnapshot: () => Promise<unknown>;
      listBufferedAuditEntries: () => Promise<unknown[]>;
    };
  }
}

const tagInput = (page: import('@playwright/test').Page) => page.getByPlaceholder('Enter tag then press Enter');

const flushButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^Flush/ });

test.describe('Offline persistence', () => {
  test('persists workspace updates across offline/online transitions', async ({ page, harness }) => {
    await harness.open();

    await page.context().setOffline(true);

    const tagValue = `offline-${Date.now()}`;
    await tagInput(page).fill(tagValue);
    await page.getByRole('button', { name: 'Add tag' }).click();

    await harness.waitForStatus(/Offline audit queue/i);

    const bufferedCount = await page.evaluate(async () => {
      const api = window.__HARNESS__;
      if (!api) return 0;
      const entries = await api.listBufferedAuditEntries();
      return Array.isArray(entries) ? entries.length : 0;
    });

    expect(bufferedCount).toBeGreaterThan(0);

    await page.context().setOffline(false);
    const flush = flushButton(page);
    await expect(flush).toBeEnabled();
    await flush.click();
    await expect(flush).toBeDisabled();

    const tags = await page.evaluate(async () => {
      const api = window.__HARNESS__;
      if (!api) return [];
      const snapshot = (await api.exportWorkspaceSnapshot()) as {
        documents?: Array<{ tags?: string[] }>;
      };
      return snapshot?.documents?.[0]?.tags ?? [];
    });

    expect(tags).toContain(tagValue);

    const remainingBuffered = await page.evaluate(async () => {
      const api = window.__HARNESS__;
      if (!api) return -1;
      const entries = await api.listBufferedAuditEntries();
      return Array.isArray(entries) ? entries.length : -1;
    });

    expect(remainingBuffered).toBe(0);
  });
});
