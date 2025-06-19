import {test, expect} from '@playwright/test';

test('Ghost.org page loads', async ({page}) => {
    await page.goto('http://localhost:2368');
    await expect(page).toHaveTitle(/Ghost/);
});
