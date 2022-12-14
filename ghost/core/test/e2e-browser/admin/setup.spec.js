const {expect, test} = require('@playwright/test');

test.describe('Admin', () => {
    test.describe('Setup', () => {
        test('Loads Admin', async ({page}) => {
            const response = await page.goto('/ghost');
            expect(response.status()).toEqual(200);
        });

        test('Is setup correctly', async ({page}) => {
            await page.goto('/ghost');
            await expect(page.locator('.gh-nav-menu-details-sitetitle')).toHaveText(/The Local Test/);
        });
    });
});
