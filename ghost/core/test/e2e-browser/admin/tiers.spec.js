const {expect, test} = require('@playwright/test');
const {createTier, createOffer, getUniqueName, getSlug} = require('../utils');

test.describe('Admin', () => {
    test.describe('Tiers', () => {
        test('Can create a Tier and Offer', async ({page}) => {
            await page.goto('/ghost');
            const tierName = getUniqueName('New Test Tier');
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

            await test.step('Check that offers and tiers are available on Offers page', async () => {
                await page.locator('[data-test-nav="offers"]').click();
                await page.waitForSelector('[data-test-offers-list]');
                await expect(page.locator('[data-test-offers-list]')).toContainText(tierName);
                await expect(page.locator('[data-test-offers-list]')).toContainText(offerName);
            });
        });

        test('Can create additional Tier', async ({page}) => {
            await page.goto('/ghost');
            const tierName = getUniqueName('New Test Tier');
            const enableInPortal = false;
            await createTier(page, {
                name: tierName,
                monthlyPrice: 100, // ordered by price, this should be the most expensive so we know it's last
                yearlyPrice: 1000
            }, enableInPortal);

            await test.step('Open Portal settings', async () => {
                await page.locator('[data-test-nav="settings"]').click();
                await page.locator('[data-test-nav="members-membership"]').click();
                await page.locator('[data-test-toggle="portal-settings"]').click();
            });

            await test.step('Make sure newly created tier in the list and not selected', async () => {
                // Wait until the list of tiers available at signup is visible
                await page.waitForSelector('[data-test-tiers-at-signup]');
                await page.locator(`[data-test-settings-tier-label="${tierName}"]`);
                expect(await page.locator(`[data-test-settings-tier-input="${tierName}"]`).isChecked()).toBeFalsy();
            });
        });

        test('Can update Tier', async ({page}) => {
            await page.goto('/ghost');
            const tierName = getUniqueName('New Test Tier');
            const tierId = getSlug(tierName);
            const updatedTierName = getUniqueName('Updated Test Tier Name');
            const updatedMonthlyPrice = '66';
            const updatedYearlyPrice = '666';
            const updatedDescription = 'Updated description text';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 5,
                yearlyPrice: 50
            });

            await test.step('Open Membership settings', async () => {
                await page.locator('[data-test-nav="settings"]').click();
                await page.locator('[data-test-nav="members-membership"]').click();
                // Tiers request can take time, so waiting until there is no connections before interacting with them
                await page.waitForLoadState('networkidle');
            });

            const tierCard = await test.step('Expand the premium tier list and find the new tier', async () => {
                await page.locator('[data-test-toggle-pub-info]').click();
                await page.waitForSelector(`[data-test-tier-card="${tierId}"]`);

                return await page.locator(`[data-test-tier-card="${tierId}"]`);
            });

            await test.step('Open modal and edit tier information', async () => {
                await tierCard.locator('[data-test-button="tiers-actions"]').click();
                await tierCard.locator('[data-test-button="edit-tier"]').click();
                const modal = page.locator('[data-test-modal="edit-tier"]');

                await modal.locator('[data-test-input="tier-name"]').first().fill(updatedTierName);
                await modal.locator('[data-test-input="tier-description"]').first().fill(updatedDescription);
                await modal.locator('[data-test-input="monthly-price"]').fill(updatedMonthlyPrice);
                await modal.locator('[data-test-input="yearly-price"]').fill(updatedYearlyPrice);
                await page.locator('[data-test-button="save-tier"]').click();
            });

            const portalFrame = await test.step('Go to website and open portal', async () => {
                await page.goto('/');
                const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
                const frame = page.frameLocator('[data-testid="portal-popup-frame"]');
                await portalTriggerButton.click();

                return frame;
            });

            const portalTierCard = await test.step('Find the updated tier card', async () => {
                await portalFrame.locator('[data-test-tier="paid"]').filter({hasText: updatedTierName}).first().isVisible();
                const card = portalFrame.locator('[data-test-tier="paid"]').filter({hasText: updatedTierName}).first();
                await expect(card).toBeVisible();

                return card;
            });

            await test.step('Check yearly price and description', async () => {
                await expect(portalTierCard.locator('.amount').first()).toHaveText(updatedYearlyPrice);
                await expect(portalTierCard.locator('.gh-portal-product-description').first()).toHaveText(updatedDescription);
            });

            await test.step('Check monthly price', async () => {
                await portalFrame.locator('[data-test-button="switch-monthly"]').click();
                await expect(await portalTierCard.getByText('/month')).toBeVisible();
                await expect(portalTierCard.locator('.amount').first()).toHaveText(updatedMonthlyPrice);
            });
        });

        test('Can archive and unarchive a Tier', async ({page}) => {
            await page.goto('/ghost');
            const tierName = getUniqueName('Archive Tier');
            const tierId = getSlug(tierName);
            await createTier(page, {
                name: tierName,
                monthlyPrice: 5,
                yearlyPrice: 50
            });

            await test.step('Open Membership settings', async () => {
                await page.locator('[data-test-nav="settings"]').click();
                await page.locator('[data-test-nav="members-membership"]').click();
                // Tiers request can take time, so waiting until there is no connections before interacting with them
                await page.waitForLoadState('networkidle');
            });

            const tierCard = await test.step('Expand the premium tier list and find the new tier', async () => {
                await page.locator('[data-test-toggle-pub-info]').click();
                await page.waitForSelector(`[data-test-tier-card="${tierId}"]`);

                return await page.locator(`[data-test-tier-card="${tierId}"]`);
            });

            await test.step('Archive tier', async () => {
                await tierCard.locator('[data-test-button="tiers-actions"]').click();
                await tierCard.locator('[data-test-button="archive-tier"]').click();
                const modal = page.locator('[data-test-modal="archive-tier"]');
                await modal.locator('[data-test-button="archive-tier"]').click();
            });

            await test.step('Archived tier should not be available in active tiers', async () => {
                await expect(page.locator(`[data-test-tier-card="${tierId}"]`)).toBeHidden();
            });

            await test.step('Archived tier should be available in archived tiers', async () => {
                const tiersSelect = await page.locator('[data-test-select-tiers-list]');
                await tiersSelect.click();
                await page.getByRole('option', {name: 'Archived'}).click();
                await expect(page.locator(`[data-test-tier-card="${tierId}"]`)).toBeVisible();
            });

            await test.step('Archived tier should not be available in portal settings', async () => {
                await expect(page.locator(`[data-test-settings-tier-label="${tierName}"]`)).toBeHidden();
            });

            await test.step('Unarchive tier', async () => {
                await tierCard.locator('[data-test-button="tiers-actions"]').click();
                await tierCard.locator('[data-test-button="unarchive-tier"]').click();
                const modal = page.locator('[data-test-modal="unarchive-tier"]');
                await modal.locator('[data-test-button="unarchive-tier"]').click();
            });

            await test.step('Unarchived tier should be available in active tiers', async () => {
                await expect(page.locator(`[data-test-tier-card="${tierId}"]`)).toBeVisible();
            });

            await test.step('Open Portal settings', async () => {
                await page.locator('[data-test-toggle="portal-settings"]').click();
                // Wait until the list of tiers available at signup is visible
                await page.waitForSelector('[data-test-tiers-at-signup]');
            });

            await test.step('Unarchived tier should be available in portal settings', async () => {
                await page.locator(`[data-test-settings-tier-label="${tierName}"]`);
                expect(await page.locator(`[data-test-settings-tier-input="${tierName}"]`).isChecked()).toBeFalsy();
            });
        });
    });
});
