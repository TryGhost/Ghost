import {PostFactory, createPostFactory} from '@/data-factory';
import {PostsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

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
});
