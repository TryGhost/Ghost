import {expect, test} from '../../src/test-fixtures';

test('has correct title', async ({page, appUrls}) => {
    await page.goto(appUrls.baseURL);
    await expect(page).toHaveTitle('[DEV]');
});
