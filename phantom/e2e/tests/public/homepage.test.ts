// Vendored from /e2e/tests/public/homepage.test.ts
import {HomePage} from '../../helpers/pages';
import {expect, test} from '../../helpers/fixture';

test.describe('Ghost Public - Homepage', () => {
    test('loads correctly', async ({page}) => {
        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await expect(homePage.mainSubscribeButton).toBeVisible();
    });
});
