import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Inbox', async () => {
    test('I can view a list of articles in the Inbox', async ({page}) => {
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
        await expect(feedItems).toHaveCount(10);

        // Check that the first item title, author name and excerpt are rendered
        const firstPost = responseFixtures.activitypubInbox.posts[0];
        const firstFeedItem = feedItems.first();
        const firstFeedItemText = await firstFeedItem.textContent();

        expect(firstFeedItemText).toContain(firstPost.author.name);
        expect(firstFeedItemText).toContain(firstPost.title);
        expect(firstFeedItemText).toContain(firstPost.excerpt);
    });

    test('I can click on a post to view it', async ({page}) => {
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

    test('I can like a post', async ({page}) => {
        const secondPostFixture = responseFixtures.activitypubInbox.posts[1];

        const {lastApiRequests} = await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/inbox',
                response: responseFixtures.activitypubInbox
            },
            likePost: {
                method: 'POST',
                path: `/actions/like/${encodeURIComponent(secondPostFixture.id)}`,
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/inbox');

        // Wait for the inbox list to be visible
        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        // Get all posts
        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        // Get the second post
        const secondPost = posts.nth(1);

        // Hover over the second post to make the like button appear
        await secondPost.hover();

        // Wait for the like button to be visible on hover
        const likeButton = secondPost.getByRole('button', {name: /like/i});
        await expect(likeButton).toBeVisible();

        // Click the like button
        await likeButton.click();

        // Verify the like button is now active
        await expect(likeButton).toHaveAttribute('title', 'Undo like');
        const icon = likeButton.locator('svg');
        await expect(icon).toHaveClass(/fill-pink-500/);

        // Verify that a POST request was made to the like endpoint
        expect(lastApiRequests.likePost).toBeTruthy();
    });

    test('I can reply to a post', async ({page}) => {
        const secondPostFixture = responseFixtures.activitypubInbox.posts[1];

        const {lastApiRequests} = await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/inbox',
                response: responseFixtures.activitypubInbox
            },
            getPost: {
                method: 'GET',
                path: `/post/${encodeURIComponent(secondPostFixture.id)}`,
                response: {
                    ...secondPostFixture,
                    metadata: {
                        ghostAuthors: []
                    }
                }
            },
            replyToPost: {
                method: 'POST',
                path: `/actions/reply/${encodeURIComponent(secondPostFixture.id)}`,
                response: {
                    id: 'new-reply-id',
                    type: 'Note',
                    content: 'This is a test reply'
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

        // Get the second post
        const secondPost = posts.nth(1);

        // Hover over the second post to make the comment button appear
        await secondPost.hover();

        // Wait for the comment button to be visible on hover
        const replyButton = secondPost.getByRole('button', {name: /reply/i});
        await expect(replyButton).toBeVisible();

        // Click the reply button
        await replyButton.click();

        // Verify the route changed and includes focusReply param
        await expect(page).toHaveURL(new RegExp(`/inbox/${encodeURIComponent(secondPostFixture.id)}\\?focusReply=true`));

        // Wait for the modal to show
        await page.waitForSelector('[role="dialog"]', {timeout: 10000});

        // Find the reply textarea and type a reply
        const replyTextarea = page.getByPlaceholder(/reply/i);
        await expect(replyTextarea).toBeVisible();
        await expect(replyTextarea).toBeFocused();

        await replyTextarea.fill('This is a test reply');

        // Click the Post button
        const postButton = page.locator('button#post');
        await expect(postButton).toBeEnabled();
        await postButton.click();

        // Verify that a POST request was made to the reply endpoint
        expect(lastApiRequests.replyToPost).toBeTruthy();
        expect(lastApiRequests.replyToPost?.body).toMatchObject({
            content: 'This is a test reply'
        });
    });
});
