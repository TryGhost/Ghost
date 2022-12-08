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
        test('Can update Tier', async ({page}) => {
            await page.goto('/ghost');
            const tierName = 'New Test Tier';
            const updatedTierName = 'Updated Test Tier Name';
            const updatedMonthlyPrice = '66';
            const updatedYearlyPrice = '666';
            const updatedDescription = 'Updated description text';
            const enableInPortal = true;
            await createTier(page, {
                name: tierName,
                monthlyPrice: 5,
                yearlyPrice: 50
            }, enableInPortal);

            // Open Membership settings
            await page.locator('.gh-nav a[href="#/settings/"]').click();
            await page.locator('.gh-setting-group').filter({hasText: 'Membership'}).click();

            // Expand the premium tier list
            await page.locator('[data-test-toggle-pub-info]').click({
                delay: 500 // TODO: Figure out how to prevent this from opening with an empty list without using delay
            });

            // Find the new tier
            await page.locator('[data-test-tier-card]').filter({hasText: tierName}).first().isVisible();
            const tierCard = page.locator('[data-test-tier-card]').filter({hasText: tierName}).first();

            // Enter edit mode
            await tierCard.locator('[data-test-button="tiers-actions"]').click();
            await tierCard.locator('[data-test-button="edit-tier"]').click();            
            const modal = page.locator('.modal-content');

            // Edit tier information
            await modal.locator('[data-test-input="tier-name"]').first().fill(updatedTierName);
            await modal.locator('[data-test-input="tier-description"]').first().fill(updatedDescription);
            await modal.locator('[data-test-input="monthly-price"]').fill(updatedMonthlyPrice);
            await modal.locator('[data-test-input="yearly-price"]').fill(updatedYearlyPrice);
            await modal.locator('[data-test-button="save-tier"]').click();            

            // Go to website and open portal
            await page.goto('/');
            const portalTriggerButton = page.frameLocator('#ghost-portal-root iframe.gh-portal-triggerbtn-iframe').locator('div').nth(1);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');
            await portalTriggerButton.click();

            // Find the updated tier card
            await portalFrame.locator('[data-test-tier="paid"]').filter({hasText: updatedTierName}).first().isVisible();
            const portalTierCard = portalFrame.locator('[data-test-tier="paid"]').filter({hasText: updatedTierName}).first();
            await expect(portalTierCard).toBeVisible();

            // Check if the details are updated
            // Check yearly price
            await expect(portalTierCard.locator('.amount').first()).toHaveText(updatedYearlyPrice);

            // Check description
            await expect(portalTierCard.locator('.gh-portal-product-description').first()).toHaveText(updatedDescription);

            // Check monthly price
            await portalFrame.locator('[data-test-button="switch-monthly"]').click();
            await expect(await portalTierCard.getByText('/month')).toBeVisible();
            await expect(portalTierCard.locator('.amount').first()).toHaveText(updatedMonthlyPrice);
        });
    });
});
