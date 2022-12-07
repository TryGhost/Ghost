const {expect, test} = require('@playwright/test');
const {createTier, createOffer} = require('../utils');

test.describe('Admin', () => {
    test.describe('Tiers', () => {
        test('Can create a Tier and Offer', async ({page}) => {
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
                offerType: 'discount',
                amount: 5
            });

            await page.locator('.gh-nav a[href="#/offers/"]').click();
            await page.locator('.gh-offers-list').waitFor({state: 'visible', timeout: 1000});
            await expect(page.locator('.gh-offers-list')).toContainText(tierName);
            await expect(page.locator('.gh-offers-list')).toContainText(offerName);
        });
    });
});
