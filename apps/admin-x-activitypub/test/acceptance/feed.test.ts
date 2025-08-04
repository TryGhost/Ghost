import activityPubUser from '../utils/responses/activitypub/users.json';
import feedFixture from '../utils/responses/activitypub/feed.json';
import {expect, test} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

test.describe('Feed', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test('I can publish a note', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/v1/feed/notes',
                response: feedFixture
            },
            getActivityPubUser: {
                method: 'GET',
                path: '/users/index',
                response: activityPubUser
            },
            getAccount: {
                method: 'GET',
                path: '/v1/account/me',
                response: {
                    id: 'user-1',
                    name: 'Test User',
                    handle: '@test@localhost',
                    bio: 'Test bio',
                    url: 'https://localhost/@test',
                    avatarUrl: 'https://localhost/avatar.jpg',
                    followingCount: 10,
                    followerCount: 20
                }
            },
            postNote: {
                method: 'POST',
                path: '/v1/actions/note',
                response: {
                    post: {
                        id: 'new-note-id',
                        type: 0,
                        content: '<p>My first test note!</p>',
                        publishedAt: new Date().toISOString()
                    }
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/notes');

        // Wait for the feed to load
        const feedList = page.getByRole('list');
        await expect(feedList).toBeVisible();

        // Find and click the "New note" button in the sidebar
        const newNoteButton = page.getByRole('button', {name: 'New note'});
        await expect(newNoteButton).toBeVisible();
        await newNoteButton.click();

        // Wait for the modal to appear
        await page.waitForSelector('[role="dialog"]', {timeout: 10000});

        // Find the textarea in the modal and type content
        const noteTextarea = page.getByPlaceholder('What\'s new?');
        await expect(noteTextarea).toBeVisible();
        await expect(noteTextarea).toBeFocused();

        await noteTextarea.fill('My first test note!');

        // Cick the Post button in the modal
        const postButton = page.getByRole('button', {name: 'Post'});
        await expect(postButton).toBeEnabled();
        await postButton.click();

        // Checl that the note was published
        await expect.poll(() => lastApiRequests.postNote).toBeTruthy();
        expect(lastApiRequests.postNote?.body).toMatchObject({
            content: 'My first test note!'
        });
    });

    test('I can view a list of notes in the Feed', async ({page}) => {
        await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/v1/feed/notes',
                response: feedFixture
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/notes');

        // Wait for the feed list to be visible
        const feedList = page.getByTestId('feed-list');
        await expect(feedList).toBeVisible();

        // Check that the first page of items is rendered
        const feedItems = page.getByTestId('feed-item');
        await expect(feedItems).toHaveCount(10);

        // Check that the first item content, author name and timestamp are rendered
        const firstPost = feedFixture.posts[0];
        const firstFeedItem = feedItems.first();
        const firstFeedItemText = await firstFeedItem.textContent();

        expect(firstFeedItemText).toContain(firstPost.author.name);
        expect(firstFeedItemText).toContain(firstPost.content.replace(/<[^>]*>?/g, '').substring(0, 100));
        expect(firstFeedItemText).toContain(new Date(firstPost.publishedAt).toLocaleString('en-GB', {month: 'short', day: 'numeric'}));
    });

    test('I can like a note in my feed', async ({page}) => {
        // Use the first post which has likedByMe: false
        const firstPostFixture = feedFixture.posts[0];

        const {lastApiRequests} = await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/v1/feed/notes',
                response: feedFixture
            },
            likePost: {
                method: 'POST',
                path: `/v1/actions/like/${encodeURIComponent(firstPostFixture.id)}`,
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/notes');

        // Wait for the feed list to be visible
        const feedList = page.getByTestId('feed-list');
        await expect(feedList).toBeVisible();

        // Get all feed items
        const feedItems = page.getByTestId('feed-item');
        await expect(feedItems).toHaveCount(10);

        // Get the first post
        const firstPost = feedItems.first();

        // Hover over the first post to make the like button appear
        await firstPost.hover();

        // Click the like button
        const likeButton = firstPost.getByTestId('like-button');
        await expect(likeButton).toBeVisible();
        await likeButton.click();

        // Verify the like button is now active
        await expect(likeButton).toHaveAttribute('title', 'Undo like');
        const icon = likeButton.locator('svg');
        await expect(icon).toHaveClass(/fill-pink-500/);

        // Check that the like was created
        await expect.poll(() => lastApiRequests.likePost).toBeTruthy();
    });

    test('I can repost a note in my feed', async ({page}) => {
        // Use the first post which has repostedByMe: false and repostCount > 0 for better button visibility
        const firstPostFixture = feedFixture.posts[0];

        const {lastApiRequests} = await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/v1/feed/notes',
                response: feedFixture
            },
            repostPost: {
                method: 'POST',
                path: `/v1/actions/repost/${encodeURIComponent(firstPostFixture.id)}`,
                response: {}
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/notes');

        // Wait for the feed list to be visible
        const feedList = page.getByTestId('feed-list');
        await expect(feedList).toBeVisible();

        // Get all feed items
        const feedItems = page.getByTestId('feed-item');
        await expect(feedItems).toHaveCount(10);

        // Get the first post
        const firstPost = feedItems.first();

        // Hover over the first post to make the repost button appear
        await firstPost.hover();

        // Click the repost button
        const repostButton = firstPost.getByTestId('repost-button');
        await expect(repostButton).toBeVisible();
        await repostButton.click();

        // Check that the repost was created
        await expect.poll(() => lastApiRequests.repostPost).toBeTruthy();
    });

    test('I can reply to a note in my feed', async ({page}) => {
        // Use the third post which has some replies already
        const thirdPostFixture = feedFixture.posts[2];

        const {lastApiRequests} = await mockApi({page, requests: {
            getFeed: {
                method: 'GET',
                path: '/v1/feed/notes',
                response: feedFixture
            },
            getPost: {
                method: 'GET',
                path: `/v1/post/${encodeURIComponent(thirdPostFixture.id)}`,
                response: {
                    ...thirdPostFixture,
                    metadata: {
                        ghostAuthors: []
                    }
                }
            },
            getThread: {
                method: 'GET',
                path: `/v1/thread/${encodeURIComponent(thirdPostFixture.id)}`,
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
                path: `/v1/actions/reply/${encodeURIComponent(thirdPostFixture.id)}`,
                response: {
                    id: 'new-reply-id',
                    type: 'Note',
                    content: 'This is a test reply to a feed post'
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/notes');

        // Wait for the feed list to be visible
        const feedList = page.getByTestId('feed-list');
        await expect(feedList).toBeVisible();

        // Get all feed items
        const feedItems = page.getByTestId('feed-item');
        await expect(feedItems).toHaveCount(10);

        // Get the third post
        const thirdPost = feedItems.nth(2);

        // Hover over the third post to make the reply button appear
        await thirdPost.hover();

        // Click the reply button
        const replyButton = thirdPost.getByTestId('reply-button');
        await expect(replyButton).toBeVisible();
        await replyButton.click();

        // Wait for the modal to appear
        const modal = page.getByTestId('new-note-modal');
        await expect(modal).toBeVisible();

        // Add a reply
        const replyTextarea = modal.getByTestId('note-textarea');
        await expect(replyTextarea).toBeVisible();
        await expect(replyTextarea).toBeFocused();
        await replyTextarea.fill('This is a test reply to a feed post');

        // Post the reply
        const postButton = modal.getByTestId('post-button');
        await expect(postButton).toBeEnabled();
        await postButton.click();

        // Check that the reply was posted
        await expect.poll(() => lastApiRequests.replyToPost).toBeTruthy();
        expect(lastApiRequests.replyToPost?.body).toMatchObject({
            content: 'This is a test reply to a feed post'
        });
    });
});
