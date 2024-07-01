const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createTier, createOffer, getUniqueName, getSlug, goToMembershipPage, openTierModal} = require('../utils');

test.describe('Admin', () => {
    test.describe('Tiers', () => {
        test('Default tier should be $5mo / $50yr', async ({sharedPage}) => {
            const defaultTier = 'default-product';
            await goToMembershipPage(sharedPage);
            const tierModal = await openTierModal(sharedPage, {slug: defaultTier});

            await test.step('Default tier should be $5mo / $50yr', async () => {
                await expect(tierModal.getByLabel('Monthly price')).toHaveValue('5');
                await expect(tierModal.getByLabel('Yearly price')).toHaveValue('50');
            });
        });

        test('Can create a Tier and Offer', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            const tierName = getUniqueName('New Test Tier');
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 5,
                yearlyPrice: 50
            });
            const {offerName} = await createOffer(sharedPage, {
                name: 'Get 5% Off!',
                tierName,
                offerType: 'freeTrial',
                amount: 14
            });

            await sharedPage.goto('/ghost/');
            await sharedPage.goto('/ghost/#/settings/offers');
            await expect(sharedPage.getByTestId('offers')).toContainText(offerName);
        });

        test('Can create additional Tier', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            const tierName = getUniqueName('New Test Tier');
            const enableInPortal = false;
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 100, // ordered by price, this should be the most expensive so we know it's last
                yearlyPrice: 1000
            }, enableInPortal);

            await goToMembershipPage(sharedPage);

            await test.step('Created tier should be in Portal settings and not selected', async () => {
                await sharedPage.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

                const portalSettings = sharedPage.getByTestId('portal-modal');

                await portalSettings.getByLabel(tierName).first().waitFor();

                await expect(portalSettings.getByLabel(tierName).first()).not.toBeChecked();
            });
        });

        test('Can update Tier', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            const tierName = getUniqueName('New Test Tier');
            const slug = getSlug(tierName);
            const updatedTierName = getUniqueName('Updated Test Tier Name');
            const updatedMonthlyPrice = '66';
            const updatedYearlyPrice = '666';
            const updatedDescription = 'Updated description text';
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 5,
                yearlyPrice: 50
            });

            await goToMembershipPage(sharedPage);
            const tierModal = await openTierModal(sharedPage, {slug});

            await test.step('Open modal and edit tier information', async () => {
                await tierModal.getByLabel('Name').fill(updatedTierName);
                await tierModal.getByLabel('Description').fill(updatedDescription);
                await tierModal.getByLabel('Monthly price').fill(updatedMonthlyPrice);
                await tierModal.getByLabel('Yearly price').fill(updatedYearlyPrice);
                await tierModal.getByRole('button', {name: 'Save'}).click();
                await tierModal.getByRole('button', {name: 'Close'}).click();
            });

            const portalFrame = await test.step('Go to website and open portal', async () => {
                await sharedPage.goto('/');
                const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
                const frame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
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
                await expect(portalTierCard.getByText('/month')).toBeVisible();
                await expect(portalTierCard.locator('.amount').first()).toHaveText(updatedMonthlyPrice);
            });
        });

        // TODO: Add something more useful to this, e.g. checking in the portal
        test('Can archive and unarchive a Tier', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            const tierName = getUniqueName('Archive Tier');
            const slug = getSlug(tierName);
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 5,
                yearlyPrice: 50
            });

            await goToMembershipPage(sharedPage);
            await test.step('Archive tier', async () => {
                const tierModal = await openTierModal(sharedPage, {slug});
                await tierModal.getByRole('button', {name: 'Archive tier'}).click();
                await sharedPage.getByTestId('confirmation-modal').getByRole('button', {name: 'Archive'}).click();
                await tierModal.getByRole('button', {name: 'Save'}).click();
                await tierModal.getByRole('button', {name: 'Close'}).click();
            });

            await test.step('Archived tier should not be available in active tiers', async () => {
                await expect(sharedPage.locator(`[data-testid="tier-card"][data-tier="${slug}"]`)).toBeHidden();
            });

            await test.step('Archived tier should be available in archived tiers', async () => {
                await sharedPage.getByTestId('tiers').getByRole('tab', {name: 'Archived'}).click();
                await expect(sharedPage.locator(`[data-testid="tier-card"][data-tier="${slug}"]`)).toBeVisible();
            });

            await test.step('Archived tier should not be available in portal settings', async () => {
                await sharedPage.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

                const portalSettings = sharedPage.getByTestId('portal-modal');

                await portalSettings.locator('input[type=checkbox]').first().waitFor();

                await expect(portalSettings.getByLabel(tierName).first()).toBeHidden();

                await portalSettings.getByRole('button', {name: 'Close'}).click();
            });

            await test.step('Unarchive tier', async () => {
                const tierModal = await openTierModal(sharedPage, {slug});
                await tierModal.getByRole('button', {name: 'Reactivate tier'}).click();
                await sharedPage.getByTestId('confirmation-modal').getByRole('button', {name: 'Reactivate'}).click();
                await tierModal.getByRole('button', {name: 'Save'}).click();
                await tierModal.getByRole('button', {name: 'Close'}).click();
            });

            await test.step('Unarchived tier should be available in active tiers', async () => {
                await sharedPage.getByTestId('tiers').getByRole('tab', {name: 'Active'}).click();
                await expect(sharedPage.locator(`[data-testid="tier-card"][data-tier="${slug}"]`)).toBeVisible();
            });

            await test.step('Unarchived tier should be available in portal settings', async () => {
                await sharedPage.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

                const portalSettings = sharedPage.getByTestId('portal-modal');

                await portalSettings.locator('input[type=checkbox]').first().waitFor();

                await expect(portalSettings.getByLabel(tierName).first()).toBeVisible();

                await portalSettings.getByRole('button', {name: 'Close'}).click();
            });
        });
    });
});
