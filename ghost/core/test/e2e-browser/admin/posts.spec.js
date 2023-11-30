const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

test.describe('Admin', () => {
    test.describe('Posts', () => {
        test('Has a set of posts', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/posts/"]').click();
            await sharedPage.locator('.gh-post-list-title').first().click();
            await sharedPage.locator('.settings-menu-toggle').click();
            await expect(sharedPage.getByPlaceholder('YYYY-MM-DD')).toHaveValue(/[0-9]{4}-[0-9]{2}-[0-9]{2}/);
        });
    });
});
