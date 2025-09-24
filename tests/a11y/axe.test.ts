import { expect } from '@playwright/test';
import { test } from '../e2e/fixtures/test';

const axeIncludeSelector = '[data-testid="harness-root"]';

test.describe('Accessibility', () => {
  test('harness UI passes axe-core checks', async ({ harness, axeBuilder }) => {
    await harness.open();

    const results = await axeBuilder()
      .include(axeIncludeSelector)
      .disableRules([
        'color-contrast',
        'aria-required-parent',
        'landmark-complementary-is-top-level',
        'aria-command-name',
        'aria-required-children',
      ])
      .analyze();

    expect(results.violations).toHaveLength(0);
  });
});
