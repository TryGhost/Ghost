import {PostEditorPage, PostsPage} from '../../../helpers/pages';
import {PostFactory, createPostFactory} from '../../../data-factory';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Post - Settings', () => {
    test('shows correct publisher date format', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        await postFactory.create({title: 'Test Post'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();

        await postsPage.getPostByTitle('Test Post').click();
        const editPage = new PostEditorPage(page);
        await editPage.settingsToggleButton.click();

        await expect(editPage.settingsMenu.publishDateInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    });
});
