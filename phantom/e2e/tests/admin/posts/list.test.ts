// Posts list coverage against the imported fixture content, using upstream's
// PostsPage object.
import {PostsPage} from '../../../helpers/pages';
import {expect, test} from '../../../helpers/fixture';

test.describe('Ghost Admin - Posts list', () => {
    test('lists the imported published post', async ({page}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await expect(postsPage.getPostByTitle('Coming soon')).toBeVisible();
        await expect(postsPage.newPostButton).toBeVisible();
    });
});
