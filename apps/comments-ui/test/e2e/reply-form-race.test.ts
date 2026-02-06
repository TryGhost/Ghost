import {MOCKED_SITE_URL, MockedApi, initialize} from '../utils/e2e';
import {buildReply} from '../utils/fixtures';
import {expect, test} from '@playwright/test';

test.describe('Reply form', () => {
    test('reply form appears immediately when clicking reply, even with slow replies API', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>Main comment</p>',
            replies: [
                buildReply({html: '<p>First reply</p>'})
            ]
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // After initialization, intercept the replies endpoint so it never responds.
        // Playwright routes are LIFO, so this takes priority over MockedApi's handler.
        // Only affects subsequent requests — initial load already completed.
        await page.route(`${MOCKED_SITE_URL}/members/api/comments/*/replies/*`, () => {
            // Intentionally never respond — blocks loadMoreReplies in openCommentForm
        });

        // Click Reply on the first reply (reply-to-reply scenario).
        // This triggers openCommentForm which calls loadMoreReplies before
        // adding the form to openCommentForms state.
        const parentComment = frame.getByTestId('comment-component').nth(0);
        const replyComment = parentComment.getByTestId('comment-component').nth(0);
        await replyComment.getByTestId('reply-button').click();

        // The reply form should appear immediately, not after loadMoreReplies.
        // Without the fix: openCommentForm awaits the hung loadMoreReplies call,
        //   so openCommentForms is never updated and the form never renders.
        // With the fix: a sync action immediately adds the form to state.
        const replyForm = frame.getByTestId('reply-form');
        await expect(replyForm).toBeVisible();
    });
});
