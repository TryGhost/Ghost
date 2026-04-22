import {MockedApi, initialize, waitEditorFocused} from '../utils/e2e';
import {buildReply} from '../utils/fixtures';
import {expect, test} from '@playwright/test';

test.describe('Reply submission', () => {
    test('shows replies added by other users while composing', async ({page}) => {
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

        const mainComment = frame.getByTestId('comment-component').first();
        await mainComment.getByTestId('reply-button').first().click();

        const replyForm = frame.getByTestId('reply-form');
        await expect(replyForm).toBeVisible();
        await waitEditorFocused(replyForm);

        // Simulate User B posting a reply while User A is composing
        const parentComment = mockedApi.comments[0];
        parentComment.replies.push(buildReply({
            html: '<p>Concurrent reply from User B</p>',
            parent_id: parentComment.id
        }));
        parentComment.count.replies = parentComment.replies.length;

        const editor = replyForm.getByTestId('editor');
        await editor.fill('User A reply');
        await replyForm.getByTestId('submit-form-button').click();

        // All three replies should be visible after refetch
        const replies = mainComment.getByTestId('comment-component');
        await expect(replies).toHaveCount(3);
        await expect(replies.nth(0)).toContainText('First reply');
        await expect(replies.nth(1)).toContainText('Concurrent reply from User B');
        await expect(replies.nth(2)).toContainText('User A reply');
    });
});
