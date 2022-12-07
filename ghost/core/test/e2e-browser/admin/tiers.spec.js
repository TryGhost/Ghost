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
        test('Can create additional Tier', async ({page}) => {
            await page.goto('/ghost');
            const tierName = 'New Test Tier';
            const enableInPortal = false;
            await createTier(page, {
                name: tierName,
                monthlyPrice: 5,
                yearlyPrice: 50
            }, enableInPortal);
        
            // Open Portal settings
            await page.locator('.gh-nav a[href="#/settings/"]').click();
            await page.locator('.gh-setting-group').filter({hasText: 'Membership'}).click();
            await page.locator('[data-test-toggle="portal-settings"]').click();
        
            // Wait until the list of tiers available at signup is visible
            await page.locator('[data-test-tiers-at-signup]').first().waitFor({state: 'visible', timeout: 1000});
        
            // Make sure newly created tier is in the list
            await expect(page.locator('[data-test-tier-at-signup] > label > p').last()).toContainText(tierName);

            // Make sure newly created tier is in not selected
            expect(await page.locator('[data-test-tier-at-signup] > label > input').last().isChecked()).toBeFalsy();
        });
    });
});
