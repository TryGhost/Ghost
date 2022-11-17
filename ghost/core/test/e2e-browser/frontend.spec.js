const {expect, test} = require('@playwright/test');

test.describe('Ghost frontend', function () {
    test('Loads the homepage', async ({page}) => {
        const response = await page.goto('/');
        expect(response.status()).toEqual(200);
    });
});
