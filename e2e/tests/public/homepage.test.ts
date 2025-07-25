import {test, expect} from '@playwright/test';
import {HomePage} from '../../helpers/pages/public';

test.describe('Ghost Homepage', () => {
    test('loads correctly', async ({page}) => {
        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await expect(homePage.mainSubscribeButton).toBeVisible();
    });
});
