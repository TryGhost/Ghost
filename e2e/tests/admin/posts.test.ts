import {PostEditorPage, PostsPage} from '../../helpers/pages';
import {PostFactory, createPostFactory} from '../../data-factory';
import {expect, test} from '../../helpers/playwright';

test.describe('Ghost Admin - Posts', () => {
    test('lists posts', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);

        const postsPage = new PostsPage(page);
        await postsPage.goto();

        await expect(postsPage.postsListItem).toHaveCount(1);

        await postFactory.create({title: 'Test Post'});
        await postsPage.refreshData();
        await expect(postsPage.postsListItem).toHaveCount(2);
    });

    test('has a set of posts', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        await postFactory.create({title: 'Test Post'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();

        await postsPage.getPostByTitle('Test Post').click();
        const editPage = new PostEditorPage(page);
        await editPage.settingsToggleButton.click();

        //await expect(page.getByPlaceholder('YYYY-MM-DD')).toHaveValue(/[0-9]{4}-[0-9]{2}-[0-9]{2}/);
    });
});
