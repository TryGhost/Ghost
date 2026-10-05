import { PostEditorPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

// Exercised through `editorReact`, which is off by default, so ownership of
// `/editor/post` visibly moves between the React and Ember routers.
test.describe('Ghost Admin - Labs session override', () => {
  test('keeps the React URL override for the session and returns to Ember after clearing and reloading', async ({
    page,
  }) => {
    const reactEditor = new PostEditorPage(page, { implementation: 'react' });
    const emberEditor = new PostEditorPage(page);

    await page.goto('/ghost/#/editor/post?labs=editorReact');
    await expect(reactEditor.titleInput).toBeVisible();
    await expect(emberEditor.titleInput).toBeHidden();

    // A fresh document without the query parameter retains the session choice.
    await page.goto('/ghost/#/editor/post');
    await page.reload();
    await expect(reactEditor.titleInput).toBeVisible();
    await expect(emberEditor.titleInput).toBeHidden();

    // Reload after clearing so both routers start with the same ownership state.
    await page.goto('/ghost/#/editor/post?labs=');
    await page.reload();
    await expect(emberEditor.titleInput).toBeVisible();
    await expect(reactEditor.titleInput).toBeHidden();
  });
});
