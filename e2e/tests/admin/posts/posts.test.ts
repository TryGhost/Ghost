import {PostFactory, createPostFactory} from '../../../data-factory';
import {PostsPage} from '../../../helpers/pages';
import {expect, test} from '../../../helpers/playwright';

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
});
