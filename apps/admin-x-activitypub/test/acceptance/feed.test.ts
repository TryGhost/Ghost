import activityPubUser from '../utils/responses/activitypub/users.json';
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

    test('I can like a note in my feed', async ({page}) => {
        // Use the first post which has likedByMe: false
        const firstPostFixture = feedFixture.posts[0];

        const {lastApiRequests} = await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/feed',
                response: feedFixture
            },
            likePost: {
                method: 'POST',
                path: `/actions/like/${encodeURIComponent(firstPostFixture.id)}`,
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/feed');

        // Wait for the feed list to be visible
        const feedList = page.getByRole('list');
        await expect(feedList).toBeVisible();

        // Get all feed items
        const feedItems = page.getByRole('listitem');
        await expect(feedItems).toHaveCount(10);

        // Get the first post
        const firstPost = feedItems.first();

        // Hover over the first post to make the like button appear
        await firstPost.hover();

        // Wait for the like button to be visible on hover
        const likeButton = firstPost.getByRole('button', {name: /like/i}).first(); // First() to avoid matching "Undo like" on other posts
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

    test('I can repost a note in my feed', async ({page}) => {
        // Use the last post which has repostedByMe: false and no repostedBy
        const lastPostFixture = feedFixture.posts[9]; // index 9 is the 10th post

        const {lastApiRequests} = await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/feed',
                response: feedFixture
            },
            repostPost: {
                method: 'POST',
                path: `/actions/repost/${encodeURIComponent(lastPostFixture.id)}`,
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/feed');

        // Wait for the feed list to be visible
        const feedList = page.getByRole('list');
        await expect(feedList).toBeVisible();

        // Get all feed items
        const feedItems = page.getByRole('listitem');
        await expect(feedItems).toHaveCount(10);

        // Get the last post (10th item, index 9)
        const lastPost = feedItems.nth(9);

        // Hover over the last post to make the repost button appear
        await lastPost.hover();

        // The repost button is at index 3 (0: menu, 1: like, 2: comment, 3: repost)
        const actionButtons = lastPost.getByRole('button');
        const repostButton = actionButtons.nth(3);

        // Click the repost button
        await repostButton.click();

        // Wait for the request to complete
        await page.waitForTimeout(100);

        // Verify that a POST request was made to the repost endpoint
        expect(lastApiRequests.repostPost).toBeTruthy();
    });

    test('I can reply to a note in my feed', async ({page}) => {
        // Use the third post which has some replies already
        const thirdPostFixture = feedFixture.posts[2];

        const {lastApiRequests} = await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/feed',
                response: feedFixture
            },
            getPost: {
                method: 'GET',
                path: `/post/${encodeURIComponent(thirdPostFixture.id)}`,
                response: {
                    ...thirdPostFixture,
                    metadata: {
                        ghostAuthors: []
                    }
                }
            },
            getThread: {
                method: 'GET',
                path: `/thread/${encodeURIComponent(thirdPostFixture.id)}`,
                response: {
                    posts: [
                        {
                            ...thirdPostFixture
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
                path: `/actions/reply/${encodeURIComponent(thirdPostFixture.id)}`,
                response: {
                    id: 'new-reply-id',
                    type: 'Note',
                    content: 'This is a test reply to a feed post'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/feed');

        // Wait for the feed list to be visible
        const feedList = page.getByRole('list');
        await expect(feedList).toBeVisible();

        // Get all feed items
        const feedItems = page.getByRole('listitem');
        await expect(feedItems).toHaveCount(10);

        // Get the third post
        const thirdPost = feedItems.nth(2);

        // Hover over the third post to make the comment button appear
        await thirdPost.hover();

        // The comment/reply button is at index 2 (0: menu, 1: like, 2: comment, 3: repost)
        const actionButtons = thirdPost.getByRole('button');
        const commentButton = actionButtons.nth(2);

        // Click the comment button
        await commentButton.click();

        // Check if the route changed to the individual post view
        await expect(page).toHaveURL(new RegExp(`/feed/${encodeURIComponent(thirdPostFixture.id)}`));

        // Wait for the view to load
        await page.waitForTimeout(500);

        // The reply box should be visible at the bottom of the post view
        const replyTextarea = page.getByPlaceholder(/reply/i);
        await expect(replyTextarea).toBeVisible();
        await expect(replyTextarea).toBeFocused();

        await replyTextarea.fill('This is a test reply to a feed post');

        // Click the Post button
        const postButton = page.locator('button#post');
        await expect(postButton).toBeEnabled();
        await postButton.click();

        // Wait for the reply to be posted
        await page.waitForTimeout(100);

        // Verify that a POST request was made to the reply endpoint
        expect(lastApiRequests.replyToPost).toBeTruthy();
        expect(lastApiRequests.replyToPost?.body).toMatchObject({
            content: 'This is a test reply to a feed post'
        });
    });
});
