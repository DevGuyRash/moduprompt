import { expect } from '@playwright/test';
import { test } from '../fixtures/test';
import {
  DOCUMENT_ID,
  EXPORT_RECIPE_APPROVED_NAME,
  HARNESS_EXPORT_LOG_ID,
} from '../fixtures/constants';

const markdownTextarea = (page: import('@playwright/test').Page) =>
  page.getByLabel('Markdown content').first();

const harnessTelemetry = (page: import('@playwright/test').Page) => page.locator(`#${HARNESS_EXPORT_LOG_ID}`);

test.describe('Governed prompt authoring', () => {
  test('creates prompt content, applies governance, and verifies preview', async ({ page, harness }) => {
    await harness.open();

    // Update the primary markdown block
    const textarea = markdownTextarea(page);
    await textarea.click();
    await textarea.fill('## QA automation journey\nEnsure coverage for all export and governance flows.');

    // Insert reusable snippet via library
    const snippetPanel = page.getByRole('region', { name: 'Snippet details' });
    await snippetPanel.getByRole('button', { name: 'Insert snippet' }).click();

    await harness.waitForStatus('Inserted snippet');

    const notebook = page.getByRole('list', { name: 'Notebook blocks' });
    await expect(notebook.getByText('Snippet snippet-greeting')).toBeVisible();

    // Add governance tag and approve status
    const tagInput = page.getByPlaceholder('Enter tag then press Enter');
    await tagInput.fill('release-ready');
    await page.getByRole('button', { name: 'Add tag' }).click();
    await harness.waitForStatus(/Tags updated/);

    await page.getByRole('radio', { name: 'Approved' }).check();
    await harness.waitForStatus('Document approved for export');

    // Ensure preview reflects approved status and deterministic export hash
    await expect(page.getByText('Status · Approved')).toBeVisible();
    await expect(page.getByText('Preview hash', { exact: false })).toBeVisible();

    // Export should succeed and record provenance
    const exportButton = page.getByRole('button', { name: 'Export' });
    await exportButton.click();
    await harness.waitForStatus(`Exported ${EXPORT_RECIPE_APPROVED_NAME}`);

    await expect(harnessTelemetry(page)).toContainText('Provenance entries:');
    await expect(harnessTelemetry(page)).toContainText('Recipe: Approved Markdown');
  });
});
