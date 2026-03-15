import activityPubUser from '../utils/responses/activitypub/users.json';
import inboxFixture from '../utils/responses/activitypub/inbox.json';
import {expect, test} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

test.describe('Inbox', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test('I can view a list of articles in the Inbox', async ({page}) => {
        await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: inboxFixture
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: inboxFixture
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

        // Wait for the inbox list to be visible
        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        // Check that the first page of items is rendered
        const feedItems = page.getByTestId('inbox-item');
        await expect(feedItems).toHaveCount(10);

        // Check that the first item title, author name and excerpt are rendered
        const firstPost = inboxFixture.posts[0];
        const firstFeedItem = feedItems.first();
        const firstFeedItemText = await firstFeedItem.textContent();

        expect(firstFeedItemText).toContain(firstPost.author.name);
        expect(firstFeedItemText).toContain(firstPost.title);
        expect(firstFeedItemText).toContain(firstPost.excerpt);
    });

    test('I can click on a post to view it', async ({page}) => {
        const postIndex = 2;
        const postFixture = inboxFixture.posts[postIndex];

        await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: inboxFixture
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: inboxFixture
            },
            getPost: {
                method: 'GET',
                path: `/v1/replies/${encodeURIComponent(postFixture.id)}`,
                response: {
                    ...postFixture,
                    // TODO: Add metadata to the post fixture
                    post: {
                        ...postFixture,
                        metadata: {
                            ghostAuthors: []
                        }
                    },
                    ancestors: {
                        chain: [],
                        next: null
                    },
                    children: [],
                    next: null
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

        // Wait for the inbox list to be visible
        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        // Get all posts
        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        // Click on the third post
        await posts.nth(postIndex).click();

        // Verify the route changed
        await expect(page).toHaveURL(new RegExp(`/reader/${encodeURIComponent(postFixture.id)}`));

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
        const secondPostFixture = inboxFixture.posts[1];

        const {lastApiRequests} = await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: inboxFixture
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: inboxFixture
            },
            likePost: {
                method: 'POST',
                path: `/v1/actions/like/${encodeURIComponent(secondPostFixture.id)}`,
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

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

        // Click the like button
        const likeButton = secondPost.getByTestId('like-button');
        await expect(likeButton).toBeVisible();
        await likeButton.click();

        // Verify the like button is now active
        await expect(likeButton).toHaveAttribute('title', 'Undo like');
        const icon = likeButton.locator('svg');
        await expect(icon).toHaveClass(/fill-pink-500/);

        // Check that the like was created
        await expect.poll(() => lastApiRequests.likePost).toBeTruthy();
    });

    test('I can reply to a post', async ({page}) => {
        const secondPostFixture = inboxFixture.posts[1];

        const {lastApiRequests} = await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: inboxFixture
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: inboxFixture
            },
            getPost: {
                method: 'GET',
                path: `/v1/post/${encodeURIComponent(secondPostFixture.id)}`,
                response: {
                    ...secondPostFixture,
                    metadata: {
                        ghostAuthors: []
                    }
                }
            },
            getThread: {
                method: 'GET',
                path: `/v1/thread/${encodeURIComponent(secondPostFixture.id)}`,
                response: {
                    posts: [
                        {
                            ...secondPostFixture
                        }
                    ]
                }
            },
            getActivityPubUser: {
                method: 'GET',
                path: '/users/index',
                response: activityPubUser
            },
            replyToPost: {
                method: 'POST',
                path: `/v1/actions/reply/${encodeURIComponent(secondPostFixture.id)}`,
                response: {
                    id: 'new-reply-id',
                    type: 'Note',
                    content: 'This is a test reply'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

        // Wait for the inbox list to be visible
        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        // Get all posts
        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        // Get the second post
        const secondPost = posts.nth(1);

        // Hover over the second post to make the reply button appear
        await secondPost.hover();

        // Click the reply button
        const replyButton = secondPost.getByTestId('reply-button');
        await expect(replyButton).toBeVisible();
        await replyButton.click();

        // Wait for the modal to appear
        const modal = page.getByTestId('new-note-modal');
        await expect(modal).toBeVisible();

        // Add a reply
        const replyTextarea = modal.getByTestId('note-textarea');
        await expect(replyTextarea).toBeVisible();
        await expect(replyTextarea).toBeFocused();
        await replyTextarea.fill('This is a test reply');

        // Post the reply
        const postButton = modal.getByTestId('post-button');
        await expect(postButton).toBeEnabled();
        await postButton.click();

        // Verify that the reply was posted
        await expect.poll(() => lastApiRequests.replyToPost).toBeTruthy();
        expect(lastApiRequests.replyToPost?.body).toMatchObject({
            content: 'This is a test reply'
        });
    });

    test('I can repost a post', async ({page}) => {
        const secondPostFixture = inboxFixture.posts[1];

        const {lastApiRequests} = await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: inboxFixture
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: inboxFixture
            },
            repostPost: {
                method: 'POST',
                path: `/v1/actions/repost/${encodeURIComponent(secondPostFixture.id)}`,
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

        // Wait for the inbox list to be visible
        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        // Get all posts
        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        // Get the second post
        const secondPost = posts.nth(1);

        // Hover over the second post to make the repost button appear
        await secondPost.hover();

        // Click the repost button
        const repostButton = secondPost.getByTestId('repost-button');
        await expect(repostButton).toBeVisible();
        await repostButton.click();

        // Verify the repost button is now active
        await expect(repostButton).toHaveAttribute('title', 'Undo repost');
        const icon = repostButton.locator('svg');
        await expect(icon).toHaveClass(/text-green-500/);

        // Verify that the repost was created
        await expect.poll(() => lastApiRequests.repostPost).toBeTruthy();
    });
});
