import {test, expect} from '../../helpers/playwright';
import {HomePage} from '../../helpers/pages/public';

test.describe('Ghost Public - Homepage', () => {
    test('loads correctly', async ({page}) => {
        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await expect(homePage.mainSubscribeButton).toBeVisible();
    });
});
