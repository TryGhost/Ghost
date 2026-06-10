import {PostEditorPage, PostsPage} from '@/admin-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

function uniqueTitle(prefix: string) {
    return `${prefix} ${faker.string.alphanumeric(8)}`;
}

/**
 * Editor screen tests, shared between the Ember implementation (labs flag
 * `editorX` off) and the React implementation (`editorX` on). Same page
 * objects and selectors for both runs.
 *
 * Tests assert user-visible behaviour only (the editor renders, typing works,
 * content persists) rather than implementation details such as the number of
 * lexical editor instances on the page.
 */
export function defineEditorTests() {
    test('creating a draft - typed title and body are visible in the editor', async ({page}) => {
        const title = uniqueTitle('Editor draft');
        const body = 'This is my post body.';

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title, body});

        await expect(editor.lexicalEditor).toBeVisible();
        await expect(editor.lexicalEditor).toContainText(body);

        await editor.waitForSaved();
        await expect(editor.postStatus).toContainText('Draft - Saved');
    });

    test('reloading a saved draft - title and body persist', async ({page}) => {
        const title = uniqueTitle('Persisted draft');
        const body = 'This body should survive a reload.';

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title, body});
        await editor.waitForSaved();

        await page.reload();

        await expect(editor.titleInput).toHaveValue(title);
        await expect(editor.lexicalEditor).toContainText(body);
    });

    test('shows correct publish date format in post settings', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: uniqueTitle('Settings date post')});

        const editor = new PostEditorPage(page);
        await editor.gotoPost(post.id);
        await editor.settingsToggleButton.click();

        await expect(editor.settingsMenu.publishDateInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    });
}
