import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Inbox', async () => {
    test('The user can view a list of articles in the Inbox', async ({page}) => {
        await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/inbox',
                response: responseFixtures.activitypubInbox
            }
        }, options: {useActivityPub: true}});

        await page.goto('/inbox');

        // Wait for the inbox list to be visible
        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        // Check that the first page of items is rendered
        const feedItems = page.getByTestId('inbox-item');
        await expect(feedItems).toHaveCount(10); // The fixture has 10 articles

        // Check that the first item title, author name and reading time are rendered
        const firstItem = feedItems.first();
        const firstItemText = await firstItem.textContent();
        expect(firstItemText).toContain('Tech Insights'); // Author name
        expect(firstItemText).toContain('The Future of AI in Healthcare'); // Title
        expect(firstItemText).toContain('min read');
    });
});
