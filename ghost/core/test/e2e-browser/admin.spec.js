const {expect, test} = require('@playwright/test');
const {setupGhost, setupStripe, createTier} = require('./utils');
const ObjectID = require('bson-objectid').default;

test.describe('Ghost Admin', () => {
    test.beforeEach(async ({page}) => {
        // Will do initial setup or sign-in to Ghost
        await setupGhost(page);
    });

    test('Loads admin', async ({page}) => {
        const response = await page.goto('/ghost');
        expect(response.status()).toEqual(200);
    });

    test('Is setup correctly', async ({page}) => {
        await page.goto('/ghost');
        await expect(page.locator('.gh-nav-menu-details-sitetitle')).toHaveText(/The Local Test/);
    });

    test('Has a set of posts', async ({page}) => {
        await page.goto('/ghost');
        await page.locator('[data-test-nav="posts"]').click();
        await page.locator('.gh-post-list-title').first().click();
        await page.getByRole('button', {name: 'sidemenu'}).click();
        const now = new Date();
        const currentDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        await expect(page.getByPlaceholder('YYYY-MM-DD')).toHaveValue(currentDate);
    });

    test('Can create a tier and offer', async ({page}) => {
        await setupStripe(page);
        const tierName = 'New Test Tier';
        await createTier(page, {
            name: tierName,
            monthlyPrice: 5,
            yearlyPrice: 50
        });

        await page.goto('/ghost');
        await page.locator('[data-test-nav="offers"]').click();

        // Keep offer names unique
        let offerName = `Get 5% Off! (${new ObjectID()})`;

        if (await page.locator('.gh-offers-list').isVisible()) {
            const listItem = page.locator('[data-test-list="offers-list-item"]').first();
            while (await page.locator('[data-test-list="offers-list-item"]').first().isVisible().then(() => true).catch(() => false)) {
                await listItem.getByRole('link', {name: 'arrow-right'}).click();
                await page.getByRole('button', {name: 'Archive offer'}).click();
                await page
                    .locator('.modal-content')
                    .filter({hasText: 'Archive offer'})
                    .first()
                    .getByRole('button', {name: 'Archive'})
                    .click();

                const statusDropdown = await page.getByRole('button', {name: 'Archived offers arrow-down-small'});
                if (await statusDropdown.isVisible()) {
                    await statusDropdown.click();
                    await page.getByRole('option', {name: 'Active offers'}).click();
                }
            }
        }

        await page.getByRole('link', {name: 'New offer'}).click();
        await page.locator('[data-test-input="offer-name"]').fill(offerName);
        await page.locator('input#amount').fill('5');
        const priceId = await page.locator(`.gh-select-product-cadence>select>option`).getByText(`${tierName} - Monthly`).getAttribute('value');
        await page.locator('.gh-select-product-cadence>select').selectOption(priceId);
        await page.getByRole('button', {name: 'Save'}).click();
        await page.locator('[data-test-button="save"] [data-test-task-button-state="success"]').waitFor({
            state: 'visible',
            timeout: 1000
        });
        // Click the "offers" link to go back
        await page.locator('[data-test-nav="offers"]').click();
        await page.locator('.gh-offers-list').waitFor({state: 'visible', timeout: 1000});
        await expect(page.locator('.gh-offers-list')).toContainText(tierName);
        await expect(page.locator('.gh-offers-list')).toContainText(offerName);
    });
});
