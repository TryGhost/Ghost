import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe.skip('Demo', async () => {
    test('Renders the list page', async ({page}) => {
        await mockApi({page, requests: {
            browseSettings: {
                method: 'GET',
                path: /^\/settings\/\?group=/,
                response: responseFixtures.settings
            }
        }});

        await page.goto('/');

        await expect(page.locator('body')).toContainText('AdminX Demo App');
    });
});
