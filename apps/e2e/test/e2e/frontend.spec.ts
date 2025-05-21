import { test, expect } from '@playwright/test';

test('has correct title', async ({ page }) => {
  const baseURL = process.env.BASE_URL || 'https://chris-raible.ghost.is'; // Default for safety
  if (!process.env.BASE_URL) {
    console.warn('BASE_URL environment variable not set, using default for frontend test.');
  }
  await page.goto(baseURL);
  await expect(page).toHaveTitle('[DEV]');
});
