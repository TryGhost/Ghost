const {expect, test} = require('@playwright/test');

let siteUrl = process.env.TEST_URL || 'http://localhost:2368';

test('Homepage is 200', async ({page}) => {
    const response = await page.goto(siteUrl);
    expect(response.status()).toEqual(200);
});
