import {PostEditorPage, PostsPage} from '@/admin-pages';
import {PostPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

function uniqueTitle(prefix: string) {
    return `${prefix} ${faker.string.alphanumeric(8)}`;
}

function formatFrontendDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

/**
 * Post update/delete tests for the editor screen, shared between the Ember
 * implementation (labs flag `editorX` off) and the React implementation
 * (`editorX` on). Same page objects and selectors for both runs.
 */
export function definePostUpdatesTests() {
    test('updates a published post', async ({page}) => {
        const title = uniqueTitle('Publish update post');
        const initialBody = 'This is the initial published text.';
        const appendedBodyText = 'This is some updated text.';
        const customExcerpt = 'Short description and meta';
        const editor = new PostEditorPage(page);

        await editor.goto();
        await editor.createDraft({title, body: initialBody});

        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        const frontendPage = await editor.publishFlow.openPublishedPost();
        await editor.publishFlow.close();

        const publicPage = new PostPage(frontendPage);
        await expect(publicPage.articleTitle).toHaveText(title);
        await expect(publicPage.articleBody).toContainText(initialBody);
        // The site clock (container, UTC) and the test clock (host, local
        // timezone) can disagree on the calendar date near midnight — accept
        // either side of the boundary.
        const publishDates = new RegExp(
            `${formatFrontendDate(new Date())}|${formatFrontendDate(new Date(Date.now() - 24 * 60 * 60 * 1000))}`
        );
        await expect(publicPage.articleHeader).toContainText(publishDates);

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.getPostByTitle(title).click();

        await editor.appendToBody(` ${appendedBodyText}`);
        await editor.settingsToggleButton.click();
        await editor.settingsMenu.publishDateInput.fill('2022-01-07');
        await editor.settingsMenu.customExcerptInput.fill(customExcerpt);

        await expect(editor.publishSaveButton).toHaveText('Update');
        await editor.publishSaveButton.click();
        await expect(editor.publishSaveButton).toHaveText('Updated');

        await frontendPage.reload();
        await expect(publicPage.articleBody).toContainText(appendedBodyText);
        await expect(publicPage.articleHeader).toContainText('7 Jan 2022');
        await expect(publicPage.metaDescription).toHaveAttribute('content', customExcerpt);
    });

    test('delete a saved post - redirects to posts list', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.titleInput.fill(uniqueTitle('Delete a saved post'));
        await editor.titleInput.press('Enter');
        await expect(editor.postStatus).toContainText('Draft - Saved');

        await editor.settingsToggleButton.click();
        await editor.settingsMenu.deletePost();

        await expect(editor.screenTitle).toContainText('Posts');
    });

    test('delete a post with unsaved changes - redirects to posts list', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: uniqueTitle('Delete an unsaved post'), body: 'This is the content'});

        await editor.settingsToggleButton.click();
        await editor.settingsMenu.deletePost();

        await expect(editor.screenTitle).toContainText('Posts');
    });
}
