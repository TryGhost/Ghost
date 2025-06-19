import {test, expect} from '@playwright/test';

test('Ghost.org page loads', async ({page}) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Ghost/);
});
