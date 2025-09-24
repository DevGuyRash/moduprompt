import AxeBuilder from '@axe-core/playwright';
import { expect, test as base } from '@playwright/test';
import { HARNESS_STATUS_MESSAGE_ID } from './constants';

interface HarnessFixture {
  open: () => Promise<void>;
  waitForStatus: (text: string | RegExp) => Promise<void>;
}

interface Fixtures {
  harness: HarnessFixture;
  axeBuilder: () => AxeBuilder;
}

export const test = base.extend<Fixtures>({
  harness: async ({ page }, use) => {
    let opened = false;
    const helpers: HarnessFixture = {
      open: async () => {
        if (opened) return;
        await page.goto('/');
        await page.getByTestId('harness-root').waitFor({ state: 'visible' });
        opened = true;
      },
      waitForStatus: async (text) => {
        await helpers.open();
        const locator = page.locator(`#${HARNESS_STATUS_MESSAGE_ID}`);
        await locator.waitFor({ state: 'visible' });
        if (typeof text === 'string') {
          await expect(locator).toContainText(text);
        } else {
          await expect(locator).toHaveText(text);
        }
      },
    };
    await use(helpers);
  },
  axeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }));
  },
});

export { expect } from '@playwright/test';
