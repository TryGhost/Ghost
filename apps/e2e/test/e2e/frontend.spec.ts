import { test, expect } from '../test-fixtures'; // Use our custom test and expect

test('has correct title', async ({ page, appUrls }) => {
  await page.goto(appUrls.baseURL);
  await expect(page).toHaveTitle('[DEV]');
});
