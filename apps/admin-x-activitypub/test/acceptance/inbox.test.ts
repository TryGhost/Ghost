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

        await page.goto('#/inbox');

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

    test('The user can click on a post to view it', async ({page}) => {
        const postIndex = 2;
        const postFixture = responseFixtures.activitypubInbox.posts[postIndex];

        await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/inbox',
                response: responseFixtures.activitypubInbox
            },
            getPost: {
                method: 'GET',
                path: `/post/${encodeURIComponent(postFixture.id)}`,
                response: {
                    ...postFixture,
                    // TODO: Add metadata to the post fixture
                    metadata: {
                        ghostAuthors: []
                    }
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/inbox');

        // Wait for the inbox list to be visible
        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        // Get all posts
        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        // Click on the third post
        await posts.nth(postIndex).click();

        // Verify the route changed
        await expect(page).toHaveURL(new RegExp(`/inbox/${encodeURIComponent(postFixture.id)}`));

        // Wait for the modal to show
        await page.waitForSelector('[role="dialog"]', {timeout: 10000});

        // Check the modal has the correct content
        const modal = page.getByRole('dialog');

        const iframe = modal.locator('iframe');
        await expect(iframe).toBeVisible();

        const iframeContent = iframe.contentFrame();

        await expect(modal.getByText(postFixture.author.name)).toBeVisible(); // Author name (outside the iframe)
        await expect(iframeContent.getByText(postFixture.title)).toBeVisible(); // Title (inside the iframe)
        await expect(iframeContent.getByText(
            postFixture.content.replace(/<[^>]*>?/g, '').trim()
        )).toBeVisible(); // Content (inside the iframe)
    });
});
