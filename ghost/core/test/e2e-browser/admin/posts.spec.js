const {expect, test} = require('@playwright/test');

test.describe('Admin', () => {
    test.describe('Posts', () => {
        test('Has a set of posts', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/posts/"]').click();
            await page.locator('.gh-post-list-title').first().click();
            await page.locator('.settings-menu-toggle').click();
            await expect(page.getByPlaceholder('YYYY-MM-DD')).toHaveValue(/[0-9]{4}-[0-9]{2}-[0-9]{2}/);
        });
    });
});
