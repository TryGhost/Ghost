const {expect, test} = require('@playwright/test');
const {setupGhost, createTier, createOffer} = require('./utils');

test.describe('Ghost Admin', () => {
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
        await page.locator('.gh-nav a[href="#/posts/"]').click();
        await page.locator('.gh-post-list-title').first().click();
        await page.locator('.settings-menu-toggle').click();
        await expect(page.getByPlaceholder('YYYY-MM-DD')).toHaveValue(/[0-9]{4}-[0-9]{2}-[0-9]{2}/);
    });

    test('Can create a tier and offer', async ({page}) => {
        await page.goto('/ghost');
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

        await page.locator('.gh-nav a[href="#/offers/"]').click();
        await page.locator('.gh-offers-list').waitFor({state: 'visible', timeout: 1000});
        await expect(page.locator('.gh-offers-list')).toContainText(tierName);
        await expect(page.locator('.gh-offers-list')).toContainText(offerName);
    });
});
