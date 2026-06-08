import {Locator, expect, test} from '@playwright/test';
import {MOCKED_SITE_URL, MockedApi, initialize, mockAdminAuthFrame, selectText, waitEditorFocused} from '../utils/e2e';
import {buildReply} from '../utils/fixtures';

const admin = MOCKED_SITE_URL + '/ghost/';

async function selectElementContents(locator: Locator) {
    await locator.evaluate((element) => {
        const range = element.ownerDocument.createRange();
        range.selectNodeContents(element);

        const selection = element.ownerDocument.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    });
}

test.describe('Quote replies', async () => {
    let mockedApi: MockedApi;

    test.beforeEach(async () => {
        mockedApi = new MockedApi({});
        mockedApi.setMember({
            name: 'John Doe',
            expertise: 'Software development'
        });
    });

    test('quotes selected comment text into a reply', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const comment = frame.getByTestId('comment-component').nth(0);
        await selectText(comment.getByTestId('comment-content'), /comment 1/);

        const quoteButton = frame.getByTestId('quote-reply-button');
        await expect(quoteButton).toBeVisible();
        await quoteButton.click();

        const replyForm = frame.getByTestId('reply-form');
        const editor = replyForm.getByTestId('form-editor');
        await waitEditorFocused(editor);

        await expect(editor.locator('blockquote')).toHaveText('comment 1');
        await editor.type('Reply text');
        await replyForm.getByTestId('submit-form-button').click();

        expect(mockedApi.comments[0].replies).toHaveLength(1);
        expect(mockedApi.comments[0].replies[0].html).toBe('<blockquote><p>comment 1</p></blockquote><p>Reply text</p>');
    });

    test('opens the profile modal before opening a quoted reply when quoting without a name', async ({page}) => {
        mockedApi.setMember({name: null, expertise: 'Software development'});
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const comment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 1'});
        await selectText(comment.getByTestId('comment-content'), /comment 1/);
        await frame.getByTestId('quote-reply-button').click();

        const detailsFrame = page.frameLocator('iframe[title="addDetailsPopup"]');
        await expect(detailsFrame.getByTestId('profile-modal')).toBeVisible();
        await expect(frame.getByTestId('reply-form')).toHaveCount(0);

        await detailsFrame.locator('button').last().click();
        await expect(detailsFrame.getByTestId('profile-modal')).not.toBeVisible();
        await expect(frame.getByTestId('reply-form')).toHaveCount(0);

        await selectText(comment.getByTestId('comment-content'), /comment 1/);
        await frame.getByTestId('quote-reply-button').click();

        await detailsFrame.getByTestId('name-input').fill('John Doe');
        await detailsFrame.getByTestId('save-button').click();

        const replyForm = frame.getByTestId('reply-form');
        await expect(replyForm).toBeVisible();
        await expect(replyForm.getByTestId('form-editor').locator('blockquote')).toHaveText('comment 1');
    });

    test('uses inverse colors in dark mode', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            colorScheme: 'dark'
        });

        const comment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 1'});
        await selectText(comment.getByTestId('comment-content'), /comment 1/);

        const quoteButton = frame.getByTestId('quote-reply-button');
        await expect(quoteButton).toBeVisible();
        await expect(quoteButton).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await expect(quoteButton).toHaveCSS('color', 'rgb(23, 23, 23)');
    });

    test('closes an existing quoted reply form when quoting a different comment', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const firstComment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 1'});
        await selectText(firstComment.getByTestId('comment-content'), /comment 1/);
        await frame.getByTestId('quote-reply-button').click();

        await expect(frame.getByTestId('reply-form')).toHaveCount(1);
        await expect(frame.getByTestId('reply-form').getByText('comment 1')).toBeVisible();

        const secondComment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 2'});
        await selectText(secondComment.getByTestId('comment-content'), /comment 2/);
        await frame.getByTestId('quote-reply-button').click();

        await expect(frame.getByTestId('reply-form')).toHaveCount(1);
        await expect(frame.getByTestId('reply-form').getByText('comment 1')).not.toBeVisible();
        await expect(frame.getByTestId('reply-form').getByText('comment 2')).toBeVisible();
    });

    test('preserves selected inline HTML when quoting', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is <a href="https://example.com">linked text</a>.</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const comment = frame.getByTestId('comment-component').nth(0);
        await selectElementContents(comment.getByTestId('comment-content').locator('a'));
        await frame.getByTestId('quote-reply-button').click();

        const replyForm = frame.getByTestId('reply-form');
        const editor = replyForm.getByTestId('form-editor');
        await waitEditorFocused(editor);
        await editor.type('Reply text');
        await replyForm.getByTestId('submit-form-button').click();

        expect(mockedApi.comments[0].replies[0].html).toContain('<blockquote><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">linked text</a></p></blockquote>');
        expect(mockedApi.comments[0].replies[0].html).toContain('<p>Reply text</p>');
    });

    test('does not show the quote action for selections spanning comments', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        await frame.getByTestId('comment-content').nth(0).evaluate((firstComment) => {
            const secondComment = firstComment.ownerDocument.querySelectorAll('[data-testid="comment-content"]')[1];
            const firstText = firstComment.querySelector('p')!.firstChild!;
            const secondText = secondComment.querySelector('p')!.firstChild!;
            const range = firstComment.ownerDocument.createRange();
            range.setStart(firstText, 8);
            range.setEnd(secondText, 8);

            const selection = firstComment.ownerDocument.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        });

        await expect(frame.getByTestId('quote-reply-button')).toHaveCount(0);
    });

    test('does not show the quote action when the reply action is hidden', async ({page}) => {
        mockedApi.addComment({
            html: '<p>Hidden comment text</p>',
            status: 'hidden'
        });
        await mockAdminAuthFrame({page, admin});

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            admin
        });

        const hiddenComment = frame.getByTestId('comment-component').filter({hasText: 'Hidden comment text'});
        await expect(hiddenComment.getByTestId('reply-button')).toHaveCount(0);

        await selectText(hiddenComment.getByTestId('comment-content'), /Hidden comment/);
        await expect(frame.getByTestId('quote-reply-button')).toHaveCount(0);
    });

    test('quotes nested replies using the same target as Reply', async ({page}) => {
        mockedApi.addComment({
            id: 'parent-comment',
            html: '<p>Parent comment</p>',
            replies: [
                buildReply({
                    id: 'nested-reply',
                    html: '<p>Nested reply text</p>'
                })
            ]
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentsThreads: true
            }
        });

        const nestedReply = frame.getByTestId('comment-component').nth(1);
        await selectText(nestedReply.getByTestId('comment-content'), /Nested reply/);
        await frame.getByTestId('quote-reply-button').click();

        const replyForm = frame.getByTestId('reply-form');
        const editor = replyForm.getByTestId('form-editor');
        await waitEditorFocused(editor);
        await editor.type('Replying to nested');
        await replyForm.getByTestId('submit-form-button').click();

        const newReply = mockedApi.comments[0].replies[1];
        expect(newReply.parent_id).toBe('parent-comment');
        expect(newReply.in_reply_to_id).toBe('nested-reply');
        expect(newReply.html).toBe('<blockquote><p>Nested reply</p></blockquote><p>Replying to nested</p>');
    });
});
