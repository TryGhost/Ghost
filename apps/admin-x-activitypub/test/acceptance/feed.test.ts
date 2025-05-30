import feedFixture from '../utils/responses/activitypub/feed.json';
import {expect, test} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

test.describe('Feed', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test('I can view a list of notes in the Feed', async ({page}) => {
        await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/feed',
                response: feedFixture
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/feed');

        // Wait for the feed list to be visible
        const feedList = page.getByRole('list');
        await expect(feedList).toBeVisible();

        // Check that the first page of items is rendered
        const feedItems = page.getByRole('listitem');
        await expect(feedItems).toHaveCount(10);

        // Check that the first item content, author name and timestamp are rendered
        const firstPost = feedFixture.posts[0];
        const firstFeedItem = feedItems.first();
        const firstFeedItemText = await firstFeedItem.textContent();

        expect(firstFeedItemText).toContain(firstPost.author.name);
        expect(firstFeedItemText).toContain('Exciting times for web development!'); // Part of the first post's content
        expect(firstFeedItemText).toContain('2 May'); // The formatted date from firstPost.publishedAt
    });
});
