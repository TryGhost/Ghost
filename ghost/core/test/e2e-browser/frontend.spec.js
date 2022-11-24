const {expect, test} = require('@playwright/test');
const {setupGhost} = require('./utils');

test.describe('Ghost Frontend', () => {
    test.beforeEach(async ({page}) => {
        await setupGhost(page);
    });

    test.describe('Basic frontend', () => {
        test('Loads the homepage', async ({page}) => {
            const response = await page.goto('/');
            expect(response.status()).toEqual(200);
        });
    });

    test.describe('Portal flows', () => {
        test('Loads the homepage', async ({page}) => {
            const response = await page.goto('/');
            expect(response.status()).toEqual(200);

            // TODO: Implement a real portal test
        });
    });
});
