const {expect, test} = require('@playwright/test');
const {setupGhost, setupStripe, createTier, createOffer} = require('./utils');

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
        const offerName = await createOffer(page, {
            name: 'Get 5% Off!',
            tierName,
            percentOff: 5
        });

        await page.locator('[data-test-nav="offers"]').click();
        await page.locator('.gh-offers-list').waitFor({state: 'visible', timeout: 1000});
        await expect(page.locator('.gh-offers-list')).toContainText(tierName);
        await expect(page.locator('.gh-offers-list')).toContainText(offerName);
    });
});
