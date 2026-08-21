import {expect, test} from '@playwright/test';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

test.describe('Error page', () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test('hands the analytics action back to the Admin host', async ({page}) => {
        await page.goto('#/does-not-exist');

        await page.getByText('Back to the homepage').click();

        await expect.poll(async () => {
            return await page.locator('body').evaluate((body) => {
                return JSON.parse(body.dataset.externalNavigate ?? 'null');
            });
        }).toMatchObject({
            route: '/analytics/',
            isExternal: true
        });
    });
});
