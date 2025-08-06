import {HomePage} from '../../helpers/pages/public';
import {test, expect} from '../../helpers/factories/test-fixtures';
import {faker} from '@faker-js/faker';

test.describe('Ghost Homepage', () => {
    test('loads correctly', async ({page}) => {
        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await expect(homePage.mainSubscribeButton).toBeVisible();
    });

    test('published post exists', async ({page,factories}) => {
        const postTitle = `Unique Post - ${faker.datatype.uuid()}`;
        await factories.postFactory.create({
            title: postTitle,
            published_at: new Date(),
            status: 'published'
        });

        const homePage = new HomePage(page);
        await homePage.goto();
        const latestPosts = await homePage.getLatestPosts();

        expect(latestPosts.length).toBeGreaterThan(0);
        expect(latestPosts.toString()).toContain(postTitle);
    });
});
