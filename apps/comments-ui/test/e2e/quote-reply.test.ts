import {Locator, expect, test} from '@playwright/test';
import {MockedApi, getEditorModifierKey, initialize, selectText, waitEditorFocused} from '../utils/e2e';
import {buildReply} from '../utils/fixtures';

async function selectElement(locator: Locator) {
    await locator.evaluate((element) => {
        const range = element.ownerDocument.createRange();
        range.selectNode(element);

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
        await expect.poll(() => mockedApi.comments[0].replies.length).toBe(1);

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

        await detailsFrame.getByTestId('close-popup-button').click();
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

    test('keeps an existing quoted reply form open when quoting a different comment', async ({page}) => {
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

        // A quoted form contains content the user explicitly created, so it
        // counts as having unsaved changes and is never silently auto-closed.
        const secondComment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 2'});
        await selectText(secondComment.getByTestId('comment-content'), /comment 2/);
        await frame.getByTestId('quote-reply-button').click();

        await expect(frame.getByTestId('reply-form')).toHaveCount(2);
        await expect(frame.getByTestId('reply-form').getByText('comment 1')).toBeVisible();
        await expect(frame.getByTestId('reply-form').getByText('comment 2')).toBeVisible();
    });

    test('keeps a quoted reply form open when replying to a different comment', async ({page}) => {
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

        // Opening a plain reply elsewhere must not destroy the visible quote.
        const secondComment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 2'});
        await secondComment.getByTestId('reply-button').click();

        await expect(frame.getByTestId('reply-form')).toHaveCount(2);
        await expect(frame.getByTestId('reply-form').getByText('comment 1')).toBeVisible();
    });

    test('auto-closes a quoted reply form once it has been emptied', async ({page}) => {
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

        const firstEditor = frame.getByTestId('reply-form').getByTestId('form-editor');
        await waitEditorFocused(firstEditor);
        // Use the editor's own select-all binding (Mod-a) rather than the
        // browser-native one, which handles the blockquote boundary unreliably.
        await firstEditor.press(`${getEditorModifierKey()}+KeyA`);
        await firstEditor.press('Backspace');

        // An emptied form has no content worth preserving, so quoting elsewhere
        // tidies it away like any other empty form.
        const secondComment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 2'});
        await selectText(secondComment.getByTestId('comment-content'), /comment 2/);
        await frame.getByTestId('quote-reply-button').click();

        await expect(frame.getByTestId('reply-form')).toHaveCount(1);
        await expect(frame.getByTestId('reply-form').getByText('comment 2')).toBeVisible();
    });

    test('keeps an existing quoted reply form with unsaved changes when quoting a different comment', async ({page}) => {
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

        const firstReplyForm = frame.getByTestId('reply-form');
        const firstEditor = firstReplyForm.getByTestId('form-editor');
        await waitEditorFocused(firstEditor);
        await firstEditor.type('Draft reply');
        await expect(firstReplyForm).toContainText('Draft reply');

        const secondComment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 2'});
        await selectText(secondComment.getByTestId('comment-content'), /comment 2/);
        await frame.getByTestId('quote-reply-button').click();

        await expect(frame.getByTestId('reply-form')).toHaveCount(2);
        await expect(frame.getByTestId('reply-form').filter({hasText: 'Draft reply'})).toHaveCount(1);
        await expect(frame.getByTestId('reply-form').filter({hasText: 'comment 2'})).toHaveCount(1);
    });

    test('keeps an in-progress draft when re-quoting the same comment, then quoting another', async ({page}) => {
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

        const firstReplyForm = frame.getByTestId('reply-form');
        const firstEditor = firstReplyForm.getByTestId('form-editor');
        await waitEditorFocused(firstEditor);
        await firstEditor.type('Draft reply');
        await expect(firstReplyForm).toContainText('Draft reply');

        // Re-quote the same comment after typing: the draft must survive the
        // second insertion.
        await selectText(firstComment.getByTestId('comment-content'), /comment 1/);
        await frame.getByTestId('quote-reply-button').click();
        await expect(firstReplyForm).toContainText('Draft reply');

        // Quoting a different comment keeps the first form open rather than
        // silently auto-closing it and losing the draft.
        const secondComment = frame.getByTestId('comment-component').filter({hasText: 'This is comment 2'});
        await selectText(secondComment.getByTestId('comment-content'), /comment 2/);
        await frame.getByTestId('quote-reply-button').click();

        await expect(frame.getByTestId('reply-form')).toHaveCount(2);
        await expect(frame.getByTestId('reply-form').filter({hasText: 'Draft reply'})).toHaveCount(1);
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
        await selectElement(comment.getByTestId('comment-content').locator('a'));
        await frame.getByTestId('quote-reply-button').click();

        const replyForm = frame.getByTestId('reply-form');
        const editor = replyForm.getByTestId('form-editor');
        await waitEditorFocused(editor);
        await editor.type('Reply text');
        await replyForm.getByTestId('submit-form-button').click();
        await expect.poll(() => mockedApi.comments[0].replies.length).toBe(1);

        // Assert the structure (link preserved inside the quoted blockquote) without
        // pinning the exact serialized attribute order, which TipTap controls.
        const replyHtml = mockedApi.comments[0].replies[0].html;
        expect(replyHtml).toMatch(/<blockquote><p><a [^>]*href="https:\/\/example\.com"[^>]*>linked text<\/a><\/p><\/blockquote>/);
        expect(replyHtml).toContain('<p>Reply text</p>');
    });

    test('preserves whitespace between adjacent inline elements when quoting', async ({page}) => {
        mockedApi.addComment({
            html: '<p>See <a href="https://a.example">first link</a> <a href="https://b.example">second link</a></p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // Select from inside the first link through the second link, so the
        // whitespace-only text node between them sits at the top level of the
        // cloned selection fragment.
        await frame.getByTestId('comment-content').nth(0).evaluate((element) => {
            const links = element.querySelectorAll('a');
            const range = element.ownerDocument.createRange();
            range.setStart(links[0].firstChild!, 0);
            range.setEnd(links[1].firstChild!, links[1].firstChild!.textContent!.length);

            const selection = element.ownerDocument.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        });

        const replyForm = frame.getByTestId('reply-form');
        await frame.getByTestId('quote-reply-button').click();
        const editor = replyForm.getByTestId('form-editor');
        await waitEditorFocused(editor);
        await editor.type('Reply text');
        await replyForm.getByTestId('submit-form-button').click();
        await expect.poll(() => mockedApi.comments[0].replies.length).toBe(1);

        // The space between the two links must survive into the quote.
        const replyHtml = mockedApi.comments[0].replies[0].html;
        expect(replyHtml).toMatch(/first link<\/a> <a [^>]*>second link/);
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
        mockedApi.setMember({
            name: 'Disabled Member',
            can_comment: false
        });
        mockedApi.addComment({
            html: '<p>Visible comment text</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const comment = frame.getByTestId('comment-component').filter({hasText: 'Visible comment text'});
        await expect(comment.getByTestId('reply-button')).toHaveCount(0);

        await selectText(comment.getByTestId('comment-content'), /Visible comment/);
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
        await expect.poll(() => mockedApi.comments[0].replies.length).toBe(2);

        const newReply = mockedApi.comments[0].replies[1];
        expect(newReply.parent_id).toBe('parent-comment');
        expect(newReply.in_reply_to_id).toBe('nested-reply');
        expect(newReply.html).toBe('<blockquote><p>Nested reply</p></blockquote><p>Replying to nested</p>');
    });
});
