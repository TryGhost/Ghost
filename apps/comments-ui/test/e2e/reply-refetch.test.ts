import {MockedApi, initialize, waitEditorFocused} from '../utils/e2e';
import {buildReply} from '../utils/fixtures';
import {expect, test} from '@playwright/test';

test.describe('Reply submission', () => {
    test('shows replies added by other users while composing', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        // Start with a comment that has one reply
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

        // User A clicks Reply on the main comment (first reply button, not the nested one)
        const mainComment = frame.getByTestId('comment-component').first();
        await mainComment.getByTestId('reply-button').first().click();

        // Wait for reply form to appear
        const replyForm = frame.getByTestId('reply-form');
        await expect(replyForm).toBeVisible();
        await waitEditorFocused(replyForm);

        // While User A is composing, User B posts a reply (simulate by adding directly to mockedApi)
        const parentComment = mockedApi.comments[0];
        parentComment.replies.push(buildReply({
            html: '<p>Concurrent reply from User B</p>',
            parent_id: parentComment.id
        }));
        parentComment.count.replies = parentComment.replies.length;

        // User A submits their reply
        const editor = replyForm.getByTestId('editor');
        await editor.fill('User A reply');
        await replyForm.getByTestId('submit-form-button').click();

        // After submission, we should see ALL replies:
        // 1. First reply (was there from start)
        // 2. Concurrent reply from User B (added while composing)
        // 3. User A's reply (just submitted)
        //
        // With the current code (manual append), User B's reply won't appear.
        // With refetch-after-submit, all three should be visible.
        const replies = mainComment.getByTestId('comment-component');
        await expect(replies).toHaveCount(3);
        await expect(replies.nth(0)).toContainText('First reply');
        await expect(replies.nth(1)).toContainText('Concurrent reply from User B');
        await expect(replies.nth(2)).toContainText('User A reply');
    });
});
