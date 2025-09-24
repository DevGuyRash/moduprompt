import { expect } from '@playwright/test';
import { test } from '../fixtures/test';

const selectRevisionButton = (page: import('@playwright/test').Page, revision: number) =>
  page.getByRole('button', { name: `Select revision ${revision}` });

test.describe('Snippet version recovery', () => {
  test('restores an earlier snippet revision and exposes timeline metadata', async ({ page, harness }) => {
    await harness.open();

    const snippetPanel = page.getByRole('region', { name: 'Snippet details' });
    await snippetPanel.getByRole('heading', { name: 'Version history' }).waitFor();
    await page.locator('[data-testid="snippet-tree"]').getByRole('button', { name: /Greetings block/ }).click();
    await selectRevisionButton(page, 2).waitFor();
    await expect(selectRevisionButton(page, 2)).toHaveAttribute('aria-pressed', 'true');

    await selectRevisionButton(page, 1).click();
    await expect(selectRevisionButton(page, 1)).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Restore revision' }).click();
    await expect(snippetPanel.getByText('Restored new head from v1', { exact: false })).toBeVisible();

    await expect(snippetPanel.locator('[data-testid="snippet-timeline"]').getByText(/Head · v\d+/)).toBeVisible();
  });
});
