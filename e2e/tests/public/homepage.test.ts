import {HomePage} from '@/public-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Public - Homepage', () => {
    test('loads correctly', async ({page}) => {
        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await expect(homePage.mainSubscribeButton).toBeVisible();
    });

    test('sends page hit request', async ({page}) => {
        const homePage = new HomePage(page);

        // Set up request expectation before navigation
        const response = homePage.waitForPageHitRequest();
        await homePage.goto();

        // Wait for the request to be fulfilled
        await expect(response).resolves.toBeDefined();
    });
});
