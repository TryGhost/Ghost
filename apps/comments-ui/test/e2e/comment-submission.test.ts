import {MockedApi, initialize} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Comment submission', () => {
    test('new root comment appears at top regardless of sort order', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({html: '<p>Oldest comment</p>'});
        mockedApi.addComment({html: '<p>Middle comment</p>'});
        mockedApi.addComment({html: '<p>Newest comment</p>'});

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            order: 'oldest'
        });

        await expect(frame.getByTestId('comment-component')).toHaveCount(3);

        const editor = frame.getByTestId('main-form').getByTestId('editor');
        await editor.fill('My brand new comment');
        await frame.getByTestId('submit-form-button').click();

        await expect(frame.getByText('My brand new comment')).toBeVisible();

        const comments = frame.getByTestId('comment-component');
        await expect(comments).toHaveCount(4);
        await expect(comments.first()).toContainText('My brand new comment');
    });
});

test.describe('Reply submission', () => {
    test('shows all replies after posting including existing ones', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            id: 'parent-comment-id',
            html: '<p>Parent comment</p>',
            replies: [
                mockedApi.buildReply({html: '<p>Existing reply 1</p>'}),
                mockedApi.buildReply({html: '<p>Existing reply 2</p>'})
            ],
            count: {replies: 2, likes: 0}
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const parentComment = frame.getByTestId('comment-component').first();
        await parentComment.getByTestId('reply-button').first().click();

        const replyForm = frame.getByTestId('reply-form');
        await expect(replyForm).toBeVisible();
        const editor = replyForm.getByTestId('editor');
        await editor.fill('My new reply');

        await replyForm.getByTestId('submit-form-button').click();

        await expect(frame.getByText('My new reply')).toBeVisible();
        await expect(parentComment.getByTestId('comment-component')).toHaveCount(3);
    });
});
