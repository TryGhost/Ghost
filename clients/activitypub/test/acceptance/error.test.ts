import { expect, test } from '@playwright/test';
import { mockInitialApiRequests } from '../utils/initial-api-requests';

test.describe('Error page', () => {
  test.beforeEach(async ({ page }) => {
    await mockInitialApiRequests(page);
  });

  test('sends the analytics action to the Admin analytics route', async ({ page }) => {
    await page.goto('#/does-not-exist');

    await page.getByText('Back to the homepage').click();

    await expect(page).toHaveURL(/#\/analytics\/$/);
  });
});
