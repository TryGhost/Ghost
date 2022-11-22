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

test.describe('Ghost Admin', () => {
    test.describe('Without fixtures', () => {
        test.beforeAll(setupGhost);
        test.afterAll(teardownGhost);

        test('Loads admin', async () => {
            const response = await page.goto(baseURL);
            expect(response.status()).toEqual(200);
        });

        test('Is setup correctly', async () => {
            await page.goto(baseURL);
            await expect(page.locator('.gh-nav-menu-details-sitetitle')).toHaveText(/The Local Test/);
        });
    });

    test.describe('With default fixtures', () => {
        test.beforeAll(async ({browser}) => {
            await setupGhost({browser});
            await testUtils.initFixtures('default', 'users', 'members');
        });
        test.afterAll(teardownGhost);

        test('Has a set of posts', async () => {
            await page.goto(baseURL);
            await page.locator('[data-test-nav="posts"]').click();
            await page.locator('.gh-post-list-title').first().click();
            await page.getByRole('button', {name: 'sidemenu'}).click();
            const now = new Date();
            const currentDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            await expect(page.getByPlaceholder('YYYY-MM-DD')).toHaveValue(currentDate);
        });

        // TODO: Saving a tier in test mode causes a stripe error
        test('Can create a tier and offer', async () => {
            const tierName = 'New Test Tier';

            await page.goto(baseURL);
            await page.locator('[data-test-nav="settings"]').click();
            await page.locator('[data-test-nav="members-membership"]').click();
            // Expand the premium tier list
            await page.getByRole('button', {name: 'Expand'}).nth(1).click({
                delay: 10 // Wait 10 milliseconds to ensure tier information appears correctly
            });
            await page.locator('.gh-btn-add-tier').click();
            await page.locator('input[data-test-input="tier-name"]').first().fill(tierName);
            await page.locator('#monthlyPrice').fill('5');
            await page.locator('#yearlyPrice').fill('50');
            await page.locator('[data-test-button="save-tier"]').click();
            await page.waitForSelector('input[data-test-input="tier-name"]', {state: 'detached'});
            await page.locator('[data-test-nav="offers"]').click();
            await page.getByRole('link', {name: 'New offer'}).click();
            await page.locator('[data-test-input="offer-name"]').fill('Get 5% Off!');
            await page.locator('input#amount').fill('5');
            const priceId = await page.locator(`.gh-select-product-cadence>select>option[text()="${tierName} - Monthly"]`).getAttribute('value');
            await page.locator('.gh-select-product-cadence>select').selectOption(priceId);
            await page.getByRole('button', {name: 'Save'}).click();
            // Click the "offers" link to go back
            await page.locator('[data-test-link="offers-back"]').click();
            await expect(page.locator('.gh-offers-list')).toContainText(/1 active offer/i);
            await expect(page.locator('.gh-offers-list')).toContainText(/\$4.75/);
            await expect(page.locator('.gh-offers-list')).toContainText(/New Test Tier/);
        });
    });
});
