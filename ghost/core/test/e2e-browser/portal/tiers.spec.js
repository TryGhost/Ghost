const {expect, test} = require('@playwright/test');
const {createTier} = require('../utils');

test.describe('Portal', () => {
    test.describe('Tiers', () => {
        test('Can archive and unarchive a Tier', async ({page}) => {
            // Setup data for this test and ensure our start point is the dashboard
            // TODO: why doesn't this work?
            page.goto('/ghost');

            await createTier(page, {
                name: 'Archive Test One',
                monthlyPrice: 1,
                yearlyPrice: 10
            });

            await createTier(page, {
                name: 'Archive Test Two',
                monthlyPrice: 2,
                yearlyPrice: 20
            });

            await createTier(page, {
                name: 'Archive Test Three',
                monthlyPrice: 3,
                yearlyPrice: 30
            });

            page.goto('/ghost');

            // Navigate to the member settings
            await page.locator('.gh-nav a[href="#/settings/"]').click();
            await page.locator('.gh-setting-group').filter({hasText: 'Membership'}).click();

            // Expand the premium tier list
            await page.locator('[data-test-toggle-pub-info]').click({
                delay: 500 // TODO: Figure out how to prevent this from opening with an empty list without using delay
            });

            // Open Tier Two's Menu
            const tierCard = page.locator('[data-test-tier-card="archive-test-two"]');
            await tierCard.locator('[data-test-button="tiers-actions"]').click();

            // Archive the tier
            await tierCard.getByRole('button', {name: 'Archive'}).click();

            // Confirm
            await page.locator('.modal-content').getByRole('button', {name: 'Archive'}).click();
            await page.locator('.modal-content').waitFor({state: 'detached', timeout: 1000});

            await page.pause();

            await page.locator('[data-test-type-select="true"]').click();

            await page.pause();

            // Assert the state of the UI
        });
    });
});
