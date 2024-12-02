import {expect, test} from '@playwright/test';

test.describe('Inbox', async () => {
    test('Renders the inbox page', async ({page}) => {
        await page.goto('/');

        await expect(page.locator('body')).toContainText('This is your inbox');
    });
});
