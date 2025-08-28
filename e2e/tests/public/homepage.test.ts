import {test, expect} from '../../helpers/base-test';
import {HomePage} from '../../helpers/pages/public';

test.describe('Ghost Homepage', () => {
    test('loads correctly', async ({page}) => {
        // ghostReset auto-fixture ensures clean database for every test
        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await expect(homePage.mainSubscribeButton).toBeVisible();
    });
});
