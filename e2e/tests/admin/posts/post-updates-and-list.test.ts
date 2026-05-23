import {PostEditorPage, PostsPage} from '@/admin-pages';
import {PostFactory, createPostFactory} from '@/data-factory';
import {PostPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';

function formatFrontendDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

test.describe('Ghost Admin - Updating Posts', () => {
    test('updates a published post', async ({page}) => {
        const title = `publish-update-post-${Date.now()}`;
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
        await expect(publicPage.articleHeader).toContainText(formatFrontendDate(new Date()));

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
});

test.describe('Ghost Admin - Deleting Posts', () => {
    test('delete a saved post - redirects to posts list', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.titleInput.fill('Delete a post test');
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
        await editor.createDraft({title: 'Delete a post test', body: 'This is the content'});

        await editor.settingsToggleButton.click();
        await editor.settingsMenu.deletePost();

        await expect(editor.screenTitle).toContainText('Posts');
    });
});

test.describe('Ghost Admin - Posts List', () => {
    test('lists posts and reflects newly created posts', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        const title = `Test Post ${Date.now()}`;

        const postsPage = new PostsPage(page);
        await postsPage.goto();

        await postFactory.create({title});
        await postsPage.refreshData();
        await expect(postsPage.getPostByTitle(title)).toBeVisible();
    });

    test('shows correct publish date format in post settings', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        const title = `Test Post ${Date.now()}`;
        await postFactory.create({title});

        const postsPage = new PostsPage(page);
        await postsPage.goto();

        await postsPage.getPostByTitle(title).click();
        const editPage = new PostEditorPage(page);
        await editPage.settingsToggleButton.click();

        await expect(editPage.settingsMenu.publishDateInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    });
});
