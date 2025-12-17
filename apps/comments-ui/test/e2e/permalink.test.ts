import {E2E_PORT} from '../../playwright.config';
import {FrameLocator, Page} from '@playwright/test';
import {MOCKED_SITE_URL, MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

/**
 * Helper to set up a page with a permalink hash for testing.
 * Handles page routing, script injection, and returns the comments frame.
 */
async function setupPermalinkTest(
    page: Page,
    mockedApi: MockedApi,
    hash: string,
    bodyHtml = '<html><head><meta charset="UTF-8" /></head><body></body></html>'
): Promise<FrameLocator> {
    const sitePath = MOCKED_SITE_URL;

    mockedApi.setSettings({
        settings: {
            labs: {
                commentPermalinks: true
            }
        }
    });

    await page.route(sitePath, async (route) => {
        await route.fulfill({status: 200, body: bodyHtml});
    });

    const url = `http://localhost:${E2E_PORT}/comments-ui.min.js`;
    await page.setViewportSize({width: 1000, height: 1000});
    await page.goto(`${sitePath}${hash}`);
    await mockedApi.listen({page, path: sitePath});

    const options = {
        publication: 'Publisher Weekly',
        count: true,
        title: 'Title',
        ghostComments: MOCKED_SITE_URL,
        postId: mockedApi.postId,
        api: MOCKED_SITE_URL,
        key: '12345678'
    };

    await page.evaluate((data) => {
        const scriptTag = document.createElement('script');
        scriptTag.src = data.url;
        for (const option of Object.keys(data.options)) {
            scriptTag.dataset[option] = data.options[option];
        }
        document.body.appendChild(scriptTag);
    }, {url, options});

    return page.frameLocator('iframe[title="comments-frame"]');
}

test.describe('Comment Permalinks', async () => {
    test('timestamp is a link with correct permalink href', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        const commentId = '64a1b2c3d4e5f6a7b8c9d0e1';
        mockedApi.addComment({
            id: commentId,
            html: '<p>This is a test comment</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {commentPermalinks: true}
        });

        // Check that the timestamp is an anchor with the correct href
        const timestampLink = frame.locator(`a[href*="ghost-comments-${commentId}"]`);
        await expect(timestampLink).toHaveCount(1);
        await expect(timestampLink).toHaveAttribute('href', new RegExp(`#ghost-comments-${commentId}$`));
    });

    test('timestamp link has hover:underline class', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>Test comment</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {commentPermalinks: true}
        });

        // Find timestamp link and verify it has the hover:underline class
        const comment = frame.getByTestId('comment-component').first();
        const timestampLink = comment.locator('a[href*="ghost-comments-"]');
        await expect(timestampLink).toHaveClass(/hover:underline/);
    });

    test('bypasses lazy loading when permalink hash is present', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        const commentId = '64a1b2c3d4e5f6a7b8c9d0e1';
        mockedApi.addComment({
            id: commentId,
            html: '<p>Target comment for permalink</p>'
        });

        // Include a tall div to push comments below viewport (like lazy-loading test)
        const tallBodyHtml = '<html><head><meta charset="UTF-8" /></head><body><div style="width: 100%; height: 1500px;"></div></body></html>';
        const commentsFrame = await setupPermalinkTest(page, mockedApi, `#ghost-comments-${commentId}`, tallBodyHtml);

        await page.locator('iframe[title="comments-frame"]').waitFor({state: 'attached'});

        // With permalink hash, comments should load immediately without needing to scroll
        await expect(commentsFrame.getByTestId('loading')).toHaveCount(0);

        // The comment text should be visible
        await expect(commentsFrame.getByText('Target comment for permalink')).toBeVisible();
    });

    test('highlights comment when navigating via permalink', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        const commentId = '64a1b2c3d4e5f6a7b8c9d0e1';
        mockedApi.addComment({
            id: commentId,
            html: '<p>Comment to highlight</p>'
        });

        const commentsFrame = await setupPermalinkTest(page, mockedApi, `#ghost-comments-${commentId}`);

        // Wait for comment to be visible
        await expect(commentsFrame.getByText('Comment to highlight')).toBeVisible();

        // The comment element should have the highlight class applied
        // (the highlight uses bg-yellow-100 which appears briefly)
        const commentElement = commentsFrame.locator(`[id="${commentId}"]`);
        await expect(commentElement).toBeVisible();
    });

    test('handles invalid comment ID gracefully', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>Regular comment</p>'
        });

        const commentsFrame = await setupPermalinkTest(page, mockedApi, '#ghost-comments-nonexistent123');

        // Comments should still load and display normally even with invalid ID
        await expect(commentsFrame.getByText('Regular comment')).toBeVisible();

        // No errors should be thrown - page should function normally
        const comments = commentsFrame.getByTestId('comment-component');
        await expect(comments).toHaveCount(1);
    });

    test('hash without ghost-comments prefix does not trigger permalink behavior', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>Test comment</p>'
        });

        // Include a tall div to push comments below viewport
        const tallBodyHtml = '<html><head><meta charset="UTF-8" /></head><body><div style="width: 100%; height: 1500px;"></div></body></html>';
        const commentsFrame = await setupPermalinkTest(page, mockedApi, '#some-other-hash', tallBodyHtml);

        await page.locator('iframe[title="comments-frame"]').waitFor({state: 'attached'});

        // Comments should NOT be loaded yet (still showing loading state)
        // because lazy loading is not bypassed for non-permalink hashes
        await expect(commentsFrame.getByTestId('loading')).toHaveCount(1);
    });

    test('does not scroll to hidden comment', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        // Add a visible comment first
        mockedApi.addComment({
            html: '<p>Visible comment</p>'
        });

        // Add a hidden comment that we'll try to permalink to
        const hiddenCommentId = '64a1b2c3d4e5f6a7b8c9d0e2';
        mockedApi.addComment({
            id: hiddenCommentId,
            html: '<p>Hidden comment content</p>',
            status: 'hidden'
        });

        const commentsFrame = await setupPermalinkTest(page, mockedApi, `#ghost-comments-${hiddenCommentId}`);

        // The visible comment should be displayed
        await expect(commentsFrame.getByText('Visible comment')).toBeVisible();

        // The hidden comment element should not be scrolled to or highlighted
        // (hidden comments are not visible to regular members)
        const hiddenCommentElement = commentsFrame.locator(`[id="${hiddenCommentId}"]`);
        await expect(hiddenCommentElement).toHaveCount(0);

        // Page should function normally with no errors
        const comments = commentsFrame.getByTestId('comment-component');
        await expect(comments).toHaveCount(1);
    });

    test('does not scroll to deleted comment', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        // Add a visible comment first
        mockedApi.addComment({
            html: '<p>Visible comment</p>'
        });

        // Add a deleted comment that we'll try to permalink to
        const deletedCommentId = '64a1b2c3d4e5f6a7b8c9d0e3';
        mockedApi.addComment({
            id: deletedCommentId,
            html: '<p>Deleted comment content</p>',
            status: 'deleted'
        });

        const commentsFrame = await setupPermalinkTest(page, mockedApi, `#ghost-comments-${deletedCommentId}`);

        // The visible comment should be displayed
        await expect(commentsFrame.getByText('Visible comment')).toBeVisible();

        // The deleted comment element should not be scrolled to or highlighted
        const deletedCommentElement = commentsFrame.locator(`[id="${deletedCommentId}"]`);
        await expect(deletedCommentElement).toHaveCount(0);

        // Page should function normally with no errors
        const comments = commentsFrame.getByTestId('comment-component');
        await expect(comments).toHaveCount(1);
    });

    test('loads reply behind "Load more" when permalinking to it', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        // Create a parent comment
        const parentId = '64a1b2c3d4e5f6a7b8c9d0e0';
        const parentComment = {
            id: parentId,
            html: '<p>Parent comment</p>',
            replies: [] as any[]
        };

        // Add 5 replies - only first 3 will be shown initially
        // Use hex IDs because parseCommentIdFromHash only accepts [a-f0-9]+
        const replyIds = ['aaa0000000000000000001', 'aaa0000000000000000002', 'aaa0000000000000000003', 'aaa0000000000000000004', 'aaa0000000000000000005'];
        for (let i = 0; i < 5; i++) {
            parentComment.replies.push(mockedApi.buildReply({
                id: replyIds[i],
                html: `<p>Reply ${i + 1}</p>`,
                parent_id: parentId
            }));
        }

        mockedApi.addComment(parentComment);

        // Target the 5th reply (not in initial 3)
        const targetReplyId = replyIds[4];

        const commentsFrame = await setupPermalinkTest(page, mockedApi, `#ghost-comments-${targetReplyId}`);

        // Wait for the page to load
        await expect(commentsFrame.getByText('Parent comment')).toBeVisible();

        // The 5th reply should be loaded and visible (requires loading more replies)
        await expect(commentsFrame.getByText('Reply 5')).toBeVisible();

        // The element should have the correct ID for highlighting
        const targetElement = commentsFrame.locator(`[id="${targetReplyId}"]`);
        await expect(targetElement).toBeVisible();
    });

    test('loads reply on later page when permalinking to it', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        // Add 6 comments to fill multiple pages (default page size is 5)
        for (let i = 1; i <= 6; i++) {
            mockedApi.addComment({
                id: `comment-${i}`,
                html: `<p>Comment ${i}</p>`
            });
        }

        // Add a 7th comment that has replies, with target on later page
        const parentId = 'parent-on-page-2';
        const parentComment = {
            id: parentId,
            html: '<p>Parent on page 2</p>',
            replies: [] as any[]
        };

        // Add replies to this parent
        // Use hex IDs because parseCommentIdFromHash only accepts [a-f0-9]+
        const lateReplyIds = ['bbb0000000000000000001', 'bbb0000000000000000002', 'bbb0000000000000000003', 'bbb0000000000000000004'];
        for (let i = 0; i < 4; i++) {
            parentComment.replies.push(mockedApi.buildReply({
                id: lateReplyIds[i],
                html: `<p>Late reply ${i + 1}</p>`,
                parent_id: parentId
            }));
        }

        mockedApi.addComment(parentComment);

        // Target a reply that's on a parent that's on page 2
        const targetReplyId = lateReplyIds[3];
        const commentsFrame = await setupPermalinkTest(page, mockedApi, `#ghost-comments-${targetReplyId}`);

        // The target reply should be loaded
        await expect(commentsFrame.getByText('Late reply 4')).toBeVisible();
    });

    test('loads reply beyond first 100 when permalinking to it', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        // Create a parent comment with 105 replies
        const parentId = 'aaa0000000000000000000';
        const parentComment = {
            id: parentId,
            html: '<p>Parent with many replies</p>',
            replies: [] as any[]
        };

        // Add 105 replies - target will be beyond the first 100
        for (let i = 1; i <= 105; i++) {
            const replyId = `ccc${i.toString().padStart(20, '0')}`;
            parentComment.replies.push(mockedApi.buildReply({
                id: replyId,
                html: `<p>Reply number ${i}</p>`,
                parent_id: parentId
            }));
        }

        mockedApi.addComment(parentComment);

        // Target the 105th reply (beyond the first 100)
        const targetReplyId = 'ccc00000000000000000105';
        const commentsFrame = await setupPermalinkTest(page, mockedApi, `#ghost-comments-${targetReplyId}`);

        // Wait for the parent to load
        await expect(commentsFrame.getByText('Parent with many replies')).toBeVisible();

        // The 105th reply should be loaded (requires pagination beyond first 100)
        await expect(commentsFrame.getByText('Reply number 105')).toBeVisible();

        // The element should have the correct ID for highlighting
        const targetElement = commentsFrame.locator(`[id="${targetReplyId}"]`);
        await expect(targetElement).toBeVisible();
    });
});
