import {expect, test} from '../../src/e2e';

test('has correct title', async ({page, appUrls}) => {
    await page.goto(appUrls.baseURL);
    await expect(page).toHaveTitle('Test Blog');
});
