import { expect } from '@playwright/test';
import { test } from '../fixtures/test';

import { HARNESS_EXPORT_LOG_ID } from '../fixtures/constants';

const exportButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /Export|Resolve Preflight Issues/ });

const preflightDiagnostics = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Preflight diagnostics' });

const harnessTelemetry = (page: import('@playwright/test').Page) => page.locator(`#${HARNESS_EXPORT_LOG_ID}`);

test.describe('Policy-gated exports', () => {
  test('prevents export for disallowed status and logs provenance once approved', async ({ page, harness }) => {
    await harness.open();

    // Initial draft status should block export
    await expect(exportButton(page)).toBeDisabled();
    await expect(preflightDiagnostics(page)).toContainText('Preflight · 1 blocking');
    await expect(preflightDiagnostics(page)).toContainText('Document status draft is not allowed for export.');

    // Approve document to satisfy recipe gating
    await page.getByRole('radio', { name: 'Approved' }).check();
    await harness.waitForStatus('Document approved for export');

    await expect(exportButton(page)).toBeEnabled();
    await exportButton(page).click();

    await harness.waitForStatus(/Exported/);
    await expect(harnessTelemetry(page)).toContainText('Provenance entries:');
  });
});
