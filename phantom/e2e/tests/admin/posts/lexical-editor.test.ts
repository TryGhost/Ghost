// Vendored from /e2e/tests/admin/posts/lexical-editor.test.ts
import {PostEditorPage, PostsPage} from '../../../helpers/pages';
import {expect, test} from '../../../helpers/fixture';

test.describe('Ghost Admin - Lexical Editor', () => {
    test('renders primary lexical editor', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Lexical editor test', body: 'This is my post body.'});

        await expect(editor.lexicalEditor).toBeVisible();
    });

    test('renders secondary hidden lexical editor', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.newPostButton.click();

        const editor = new PostEditorPage(page);
        await editor.createDraft({title: 'Secondary lexical editor test', body: 'This is my post body.'});

        await expect(editor.secondaryEditor).toHaveCount(1);
        await expect(editor.secondaryEditor).toBeHidden();
    });
});
