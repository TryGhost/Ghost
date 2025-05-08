import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:5173/ghost/#/stats');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});
