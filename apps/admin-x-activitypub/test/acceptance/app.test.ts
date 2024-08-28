import {expect, test} from '@playwright/test';
// import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Demo', async () => {
    test('Renders the list page', async ({page}) => {
        await page.goto('/');

        await expect(page.locator('body')).toContainText('ActivityPub Inbox');
    });
});
