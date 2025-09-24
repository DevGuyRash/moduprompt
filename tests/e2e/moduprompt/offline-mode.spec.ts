import { expect } from '@playwright/test';
import { test } from '../fixtures/test';

import { HARNESS_STATUS_MESSAGE_ID } from '../fixtures/constants';

const statusMessage = (page: import('@playwright/test').Page) => page.locator(`#${HARNESS_STATUS_MESSAGE_ID}`);

const tagInput = (page: import('@playwright/test').Page) => page.getByPlaceholder('Enter tag then press Enter');

test.describe('Offline editing resilience', () => {
  test('buffers governance events offline and flushes when back online', async ({ page, harness }) => {
    await harness.open();

    await page.context().setOffline(true);

    await tagInput(page).fill('offline-buffer');
    await page.getByRole('button', { name: 'Add tag' }).click();
    await expect(statusMessage(page)).toContainText('Tags updated');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Refresh' }).click();
    await page.waitForTimeout(200);

    const flushButton = page.getByRole('button', { name: /^Flush/ });
    await expect(statusMessage(page)).toContainText('Offline audit queue');
    await expect(flushButton).toBeEnabled();

    await page.context().setOffline(false);

    await flushButton.click();

    await expect(flushButton).toBeDisabled();
    await expect(page.getByRole('status', { name: /offline audit entries/i })).toHaveCount(0);
  });
});
