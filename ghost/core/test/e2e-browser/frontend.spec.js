const {expect, test} = require('@playwright/test');
const testUtils = require('../utils');

/** @type {import('@playwright/test').Page} */
let page;
let baseURL;

const setupGhost = async ({browser}) => {
    const app = await testUtils.startGhost();
    baseURL = `${app.url}ghost/`;

    page = await browser.newPage();
    await page.goto(`${baseURL}`);
    await page.getByPlaceholder('The Daily Awesome').click();
    await page.getByPlaceholder('The Daily Awesome').fill('The Local Test');
    await page.getByPlaceholder('Jamie Larson').fill('Testy McTesterson');
    await page.getByPlaceholder('jamie@example.com').fill('testy@example.com');
    await page.getByPlaceholder('At least 10 characters').fill('Mc.T3ster$0n');
    await page.getByPlaceholder('At least 10 characters').press('Enter');
    await page.locator('.gh-done-pink').click();
};

const teardownGhost = async () => {
    await testUtils.stopGhost();
    await page.close();
};

test.describe('Ghost Frontend', () => {
    test.describe('Basic frontend', () => {
        test.beforeAll(setupGhost);
        test.afterAll(teardownGhost);

        test('Loads the homepage', async () => {
            const response = await page.goto(`${baseURL}`);
            expect(response.status()).toEqual(200);
        });
    });

    test.describe('Portal flows', () => {
        test.beforeAll(setupGhost);
        test.afterAll(teardownGhost);

        test('Loads the homepage', async () => {
            const response = await page.goto(`${baseURL}`);
            expect(response.status()).toEqual(200);

            // TODO: Implement a real portal test
        });
    });
});
