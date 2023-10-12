const {expect, test} = require('@playwright/test');
const {deleteAllMembers, createTier, createOffer, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Offers', () => {
        test('Creates and uses a free-trial Offer', async ({page}) => {
            // reset members by deleting all existing
            page.goto('/ghost');
            await deleteAllMembers(page);

            // add a new tier for offers
            const tierName = 'Portal Tier';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // add a new offer with free trial
            const offerName = await createOffer(page, {
                name: 'Black Friday Special',
                tierName,
                offerType: 'freeTrial',
                amount: 14
            });

            // check that offer was added in the offer list screen
            await expect(page.locator(`[data-test-offer="${offerName}"]`), 'Should have free-trial offer').toBeVisible();

            // open offer details page
            await page.locator(`[data-test-offer="${offerName}"] a`).first().click();

            // fetch offer url from portal settings and open it
            const portalUrl = await page.locator('[data-test-input="offer-portal-url"]').inputValue();
            await page.goto(portalUrl);

            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check offer title is shown on portal
            await expect(portalFrame.locator('.gh-portal-offer-title'), 'URL should open Portal with free-trial offer').toBeVisible();
            await expect(portalFrame.getByRole('heading', {name: offerName}), 'URL should open Portal with free-trial offer').toBeVisible();

            // fill member details and click start trial
            await portalFrame.locator('[data-test-input="input-name"]').fill('Testy McTesterson');
            await portalFrame.locator('[data-test-input="input-email"]').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Start 14-day free trial'}).click();

            // handle newsletter selection page if it opens and click continue
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }

            // complete subscription
            await completeStripeSubscription(page);

            // wait for site to load and open portal
            await portalTriggerButton.click();

            // check portal shows free trial info
            await expect(portalFrame.locator('text=Free Trial – Ends'), 'Portal should show free trial info').toBeVisible();

            // go to member list on admin
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(page.getByRole('link', {name: 'Testy McTesterson testy@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(page.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();

            // Ensure the offer redemption count was bumped
            await page.locator('.gh-nav a[href="#/offers/"]').click();
            const locator = page.locator(`[data-test-offer="${offerName}"]`).locator('[data-test-list="redemption-count"]').locator('span');
            await expect(locator).toContainText('1');
        });

        test('Creates and uses a one-time discount Offer', async ({page}) => {
            // reset members by deleting all existing
            page.goto('/ghost');
            await deleteAllMembers(page);

            // add new tier
            const tierName = 'Portal Tier';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Creates a one-time discount offer for 10% off
            const offerName = await createOffer(page, {
                name: 'Black Friday Special',
                tierName: tierName,
                offerType: 'discount',
                amount: 10
            });

            // check that offer was added in the offer list screen
            await expect(page.locator(`[data-test-offer="${offerName}"]`), 'Should have free-trial offer').toBeVisible();

            // open offer details page
            await page.locator(`[data-test-offer="${offerName}"] a`).first().click();

            // fetch offer url from portal settings and open it
            const portalUrl = await page.locator('[data-test-input="offer-portal-url"]').inputValue();
            await page.goto(portalUrl);

            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check offer title is visible on portal page
            await expect(portalFrame.locator('.gh-portal-offer-title'), 'URL should open Portal with discount offer').toBeVisible();

            // fill member details and continue
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            // check if newsletter selection screen is shown and continue
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }

            // complete stripe subscription
            await completeStripeSubscription(page);

            // wait for site to load and open portal
            await portalTriggerButton.click();
            // Discounted price should not be visible for member for one-time offers
            await expect(portalFrame.locator('text=$5.40/month'), 'Portal should not show discounted price').not.toBeVisible();

            // go to members list on admin
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(page.getByRole('link', {name: 'Testy McTesterson testy@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(page.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
        });

        test('Creates and uses a multiple-months discount Offer', async ({page}) => {
            // reset members by deleting all existing
            page.goto('/ghost');
            await deleteAllMembers(page);

            // add new tier
            const tierName = 'Portal Tier';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Creates a one-time discount offer for 10% off
            const offerName = await createOffer(page, {
                name: 'Black Friday Special',
                tierName: tierName,
                offerType: 'discount',
                discountType: 'multiple-months',
                amount: 10,
                discountDuration: 3
            });

            // check that offer was added in the offer list screen
            await expect(page.locator(`[data-test-offer="${offerName}"]`), 'Should have free-trial offer').toBeVisible();

            // open offer details page
            await page.locator(`[data-test-offer="${offerName}"] a`).first().click();

            // fetch offer url from portal settings and open it
            const portalUrl = await page.locator('[data-test-input="offer-portal-url"]').inputValue();
            await page.goto(portalUrl);

            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check offer details are shown on portal page
            await expect(portalFrame.locator('.gh-portal-offer-title'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrame.locator('text=10% off for first 3 months.'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrame.locator('text=$5.40'), 'URL should open Portal with discount offer').toBeVisible();

            // fill member details and continue
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            // check newsletter selection if shown and continue
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }

            // complete stripe subscription
            await completeStripeSubscription(page);

            // wait for site to load and open portal
            await portalTriggerButton.click();

            // Discounted price should not be visible for member for one-time offers
            await expect(portalFrame.locator('text=$5.40/month'), 'Portal should show discounted price').toBeVisible();
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(page.getByRole('link', {name: 'Testy McTesterson testy@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(page.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
        });

        test('Creates and uses a forever discount Offer', async ({page}) => {
            // reset members by deleting all existing
            page.goto('/ghost');
            await deleteAllMembers(page);

            // add tier
            const tierName = 'Portal Tier';
            await createTier(page, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Creates a one-time discount offer for 10% off
            const offerName = await createOffer(page, {
                name: 'Black Friday Special',
                tierName: tierName,
                offerType: 'discount',
                discountType: 'forever',
                amount: 10
            });

            // check that offer was added in the offer list screen
            await expect(page.locator(`[data-test-offer="${offerName}"]`), 'Should have free-trial offer').toBeVisible();

            // open offer details page
            await page.locator(`[data-test-offer="${offerName}"] a`).first().click();

            // fetch offer url from portal settings and open it
            const portalUrl = await page.locator('[data-test-input="offer-portal-url"]').inputValue();
            await page.goto(portalUrl);

            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check offer details are shown on portal page
            await expect(portalFrame.locator('.gh-portal-offer-title'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrame.locator('text=10% off forever.'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrame.locator('text=$5.40'), 'URL should open Portal with discount offer').toBeVisible();

            // fill member details and continue
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            // check if newsletter selection page is shown and continue
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }
            await completeStripeSubscription(page);

            // wait for site to load and open portal
            await portalTriggerButton.click();

            // Discounted price should be visible for member for forever offers
            await expect(portalFrame.locator('text=$5.40/month'), 'Portal should show discounted price').toBeVisible();
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
            const portalPopup = await page.locator('[data-testid="portal-popup-frame"]').isVisible();
            await expect(portalPopup).toBeFalsy();
        });
    });
});
