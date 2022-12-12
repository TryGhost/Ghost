const {expect, test} = require('@playwright/test');
const {deleteAllMembers, createTier, createOffer, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Offers', () => {
        test('Creates and uses a free-trial Offer', async ({page}) => {
            page.goto('/ghost');
            await deleteAllMembers(page);
            const tierName = 'Portal Tier';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            const offerName = await createOffer(page, {
                name: 'Black Friday Special',
                tierName,
                offerType: 'freeTrial',
                amount: 14
            });

            await expect(page.getByRole('link', {name: offerName}), 'Should have free-trial offer').toBeVisible();

            await page.locator('.gh-offers-list .gh-list-row').filter({hasText: offerName}).click();
            const portalUrl = await page.locator('input#url').inputValue();

            await page.goto(portalUrl);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');
            await expect(portalFrame.locator('.gh-portal-offer-title'), 'URL should open Portal with free-trial offer').toBeVisible();
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Start 14-day free trial'}).click();
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }
            await completeStripeSubscription(page);

            await page.waitForSelector('h1.site-title', {state: 'visible'});
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(page.getByRole('link', {name: 'Testy McTesterson testy@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(page.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();

            // Ensure the offer redemption count was bumped
            await page.locator('.gh-nav a[href="#/offers/"]').click();
            const locator = page.locator('.gh-offers-list > tr:nth-child(2) > a > span').last();
            await expect(locator).toContainText('1');
        });

        test('Creates and uses a discount Offer', async ({page}) => {
            page.goto('/ghost');
            await deleteAllMembers(page);
            const tierName = 'Portal Tier';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });
            const offerName = await createOffer(page, {
                name: 'Black Friday Special',
                tierName: tierName,
                offerType: 'discount',
                amount: 10
            });

            await expect(page.getByRole('link', {name: offerName}), 'Should have discount offer').toBeVisible();

            await page.locator('.gh-offers-list .gh-list-row').filter({hasText: offerName}).click();
            const portalUrl = await page.locator('input#url').inputValue();

            await page.goto(portalUrl);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');
            await expect(portalFrame.locator('.gh-portal-offer-title'), 'URL should open Portal with discount offer').toBeVisible();
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }
            await completeStripeSubscription(page);

            await page.waitForSelector('h1.site-title', {state: 'visible'});
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(page.getByRole('link', {name: 'Testy McTesterson testy@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(page.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
        });

        test('Archiving an offer', async ({page}) => {
            page.goto('/ghost');

            // Create a new tier to attach offer to
            const tierName = 'Portal Tier';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Create an offer. This will be archived
            const offerName = await createOffer(page, {
                name: 'To be archived',
                tierName: tierName,
                offerType: 'discount',
                amount: 10
            });

            // Archive all existing offers by creating a new offer. Using the createOffer util auto-archives all existing offers
            await createOffer(page, {
                name: 'Dummy Active Offer',
                tierName: tierName,
                offerType: 'discount',
                amount: 10
            });

            // Check if the offer appears in the archive list
            await page.locator('.gh-contentfilter-menu-trigger').click();
            await page.getByRole('option', {name: 'Archived offers'}).click();
            await expect(page.getByRole('link', {name: offerName}), 'Should have an archived offer').toBeVisible();

            // Go to the offer and grab the offer URL
            await page.locator('.gh-offers-list .gh-list-row').filter({hasText: offerName}).click();
            const portalUrl = await page.locator('input#url').inputValue();

            // Open the offer URL and make sure portal popup doesn't load
            await page.goto(portalUrl);
            await expect(page.locator('#ghost-portal-root .portal-popup')).not.toBeVisible();
        });
    });
});
