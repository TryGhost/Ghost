import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('ListIndex', async () => {
    test('Renders the list page', async ({page}) => {
        const userId = 'index';
        await mockApi({
            page,
            requests: {
                useBrowseInboxForUser: {method: 'GET', path: `/inbox/${userId}`, response: responseFixtures.activitypubInbox},
                useBrowseFollowingForUser: {method: 'GET', path: `/following/${userId}`, response: responseFixtures.activitypubFollowing}
            },
            options: {useActivityPub: true}
        });

        // Printing browser consol logs
        page.on('console', (msg) => {
            console.log(`Browser console log: ${msg.type()}: ${msg.text()}`); /* eslint-disable-line no-console */
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
        const frameLocator = page.frameLocator('#gh-ap-article-iframe');
        const textElement = await frameLocator.locator('[data-test-article-heading]').innerText();
        expect(textElement).toContain('Testing ActivityPub');

        // go back to list
        const backBtn = await page.locator('[data-test-back-button]');
        await backBtn.click();
    });
});
