const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

test.describe('Admin', () => {
    test.describe('Setup', () => {
        test('Loads Admin', async ({sharedPage}) => {
            const response = await sharedPage.goto('/ghost');
            expect(response.status()).toEqual(200);
        });

        test('Is setup correctly', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            await expect(sharedPage.locator('.gh-nav-menu-details-sitetitle')).toHaveText(/The Local Test/);
        });
    });
});
