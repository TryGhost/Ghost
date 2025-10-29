import {test, expect} from '../../helpers/playwright';
import {HomePage} from '@tryghost/e2e/helpers/pages';

test.describe('Ghost Public - Homepage', () => {
    test('loads correctly', async ({page}) => {
        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await expect(homePage.mainSubscribeButton).toBeVisible();
    });
});
