import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('ListIndex', async () => {
    test('Renders the list page', async ({page}) => {
        await mockApi({page, requests: {
            browseSite: {method: 'GET', path: '/site/', response: responseFixtures.site}
        }});

        // Printing browser consol logs
        page.on('console', (msg) => {
            console.log(`Browser console log: ${msg.type()}: ${msg.text()}`); /* eslint-disable-line no-console */
        });

        await page.route('*/**/activitypub/inbox/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                json: responseFixtures.activitypubInbox
            });
        });

        await page.route('*/**/activitypub/following/*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                json: responseFixtures.activitypubFollowing
            });
        });

        await page.goto('/');

        await expect(page.locator('body')).toContainText('ActivityPub Inbox');

        // following list
        const followingUser = await page.locator('[data-test-following] > li').textContent();
        await expect(followingUser).toEqual('@index@main.ghost.org');
        const followingCount = await page.locator('[data-test-following-count]').textContent();
        await expect(followingCount).toEqual('1');

        // following button
        const followingList = await page.locator('[data-test-following-modal]');
        await expect(followingList).toBeVisible();

        // activities
        const activity = await page.locator('[data-test-activity-heading]').textContent();
        await expect(activity).toEqual('Testing ActivityPub');

        // click on article
        const articleBtn = await page.locator('[data-test-view-article]');
        await articleBtn.click();

        // article is expanded
        const articleHeading = await page.locator('[data-test-article-heading]').textContent();
        await expect(articleHeading).toEqual('Testing ActivityPub');

        // go back to list
        const backBtn = await page.locator('[data-test-back-button]');
        await backBtn.click();
    });
});
