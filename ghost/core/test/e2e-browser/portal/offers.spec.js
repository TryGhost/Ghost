const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {deleteAllMembers, createTier, createOffer, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.setTimeout(90000); // override the default 60s in the config as these retries can run close to 60s
    test.describe('Offers', () => {
        test('Creates and uses a free-trial Offer', async ({sharedPage}) => {
            // reset members by deleting all existing
            await sharedPage.goto('/ghost');
            await deleteAllMembers(sharedPage);

            // add a new tier for offers
            const tierName = 'Trial Tier';
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // add a new offer with free trial
            const {offerName, offerLink} = await createOffer(sharedPage, {
                name: 'Black Friday Special',
                tierName,
                offerType: 'freeTrial',
                amount: 14
            });

            // check that offer was added in the offer list screen
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();
            await expect(await sharedPage.getByTestId('offers')).toContainText(offerName);

            await sharedPage.goto(offerLink);

            // Wait for the load state to ensure the page has loaded completely
            let portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            await expect(portalTriggerButton).toBeVisible();

            // Wait for the iframe to be attached to the DOM
            await expect(sharedPage.locator('[data-testid="portal-popup-frame"]')).toBeAttached({timeout: 1000});

            // Use the frameLocator to interact with elements inside the frame
            const portalFrameLocator = await sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await portalFrameLocator.locator('.gh-portal-offer-title').waitFor();

            await expect(portalFrameLocator.locator('.gh-portal-offer-title'), 'URL should open Portal with free-trial offer').toBeVisible();
            await expect(portalFrameLocator.getByRole('heading', {name: offerName}), 'URL should open Portal with free-trial offer').toBeVisible();

            // fill member details and click start trial
            await portalFrameLocator.locator('[data-test-input="input-name"]').fill('Testy McTesterson');
            await portalFrameLocator.locator('[data-test-input="input-email"]').fill('testy+trial@example.com');
            await portalFrameLocator.getByRole('button', {name: 'Start 14-day free trial'}).click();

            // handle newsletter selection page if it opens and click continue
            const hasContinueBtn = await portalFrameLocator.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrameLocator.getByRole('button', {name: 'Continue'}).click();
            }

            // complete subscription
            await completeStripeSubscription(sharedPage);

            // wait for site to load and open portal
            await portalTriggerButton.click();

            // check portal shows free trial info
            await expect(portalFrameLocator.locator('text=Free Trial – Ends'), 'Portal should show free trial info').toBeVisible();

            // go to member list on admin
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/members/"]').click();

            // // 1 member, should be Testy, on Portal Tier
            await expect(await sharedPage.getByRole('link', {name: 'Testy McTesterson testy+trial@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(await sharedPage.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();

            // // Ensure the offer redemption count was bumped
            await sharedPage.goto('/ghost/#/settings/offers');
            // await sharedPage.locator('.gh-nav a[href="#/offers/"]').click();
            const locator = await sharedPage.locator(`[data-test-offer="${offerName}"]`);
            await expect(locator).toContainText('1 redemption');
        });

        test('Creates and uses a one-time discount Offer', async ({sharedPage}) => {
            // reset members by deleting all existing
            await sharedPage.goto('/ghost');
            await deleteAllMembers(sharedPage);

            // add new tier
            const tierName = 'One-off Tier';
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Creates a one-time discount offer for 10% off
            const {offerName, offerLink} = await createOffer(sharedPage, {
                name: 'Black Friday Special',
                tierName: tierName,
                offerType: 'discount',
                amount: 10
            });

            // check that offer was added in the offer list screen
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();
            await expect(sharedPage.getByTestId('offers')).toContainText(offerName);
            // open offer details page
            // await sharedPage.locator(`[data-test-offer="${offerName}"] a`).first().click();

            // fetch offer url from portal settings and open it
            await sharedPage.goto(offerLink);

            // Wait for the load state to ensure the page has loaded completely
            await sharedPage.waitForLoadState('load');

            // Wait for the load state to ensure the page has loaded completely
            let portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            await expect(portalTriggerButton).toBeVisible();

            // Wait for the iframe to be attached to the DOM
            await expect(sharedPage.locator('[data-testid="portal-popup-frame"]')).toBeAttached({timeout: 1000});

            // Use the frameLocator to interact with elements inside the frame
            const portalFrameLocator = await sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await portalFrameLocator.locator('.gh-portal-offer-title').waitFor();

            // check offer title is visible on portal page
            await expect(portalFrameLocator.locator('.gh-portal-offer-title'), 'URL should open Portal with discount offer').toBeVisible();

            // fill member details and continue
            await portalFrameLocator.locator('#input-name').fill('Testy McTesterson');
            await portalFrameLocator.locator('#input-email').fill('testy+oneoff@example.com');
            await portalFrameLocator.getByRole('button', {name: 'Continue'}).click();

            // check if newsletter selection screen is shown and continue
            const hasContinueBtn = await portalFrameLocator.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrameLocator.getByRole('button', {name: 'Continue'}).click();
            }

            // complete stripe subscription
            await completeStripeSubscription(sharedPage);

            // wait for site to load and open portal
            await portalTriggerButton.click();
            // Discounted price should not be visible for member for one-time offers
            await expect(portalFrameLocator.locator('text=$5.40/month'), 'Portal should not show discounted price').not.toBeVisible();

            // go to members list on admin
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(await sharedPage.getByRole('link', {name: 'Testy McTesterson testy+oneoff@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(await sharedPage.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
        });

        test('Creates and uses a multiple-months discount Offer', async ({sharedPage}) => {
            // reset members by deleting all existing
            await sharedPage.goto('/ghost');
            await deleteAllMembers(sharedPage);

            // add new tier
            const tierName = 'Multiple-month Tier';
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Creates a one-time discount offer for 10% off
            const {offerName, offerLink} = await createOffer(sharedPage, {
                name: 'Black Friday Special',
                tierName: tierName,
                offerType: 'discount',
                discountType: 'multiple-months',
                amount: 10,
                discountDuration: 3
            });

            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();
            await expect(await sharedPage.getByTestId('offers')).toContainText(offerName);

            await sharedPage.goto(offerLink);

            // Wait for the load state to ensure the page has loaded completely
            await sharedPage.waitForLoadState('load');

            // Wait for the load state to ensure the page has loaded completely
            let portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            await expect(portalTriggerButton).toBeVisible();

            // Wait for the iframe to be attached to the DOM
            await expect(sharedPage.locator('[data-testid="portal-popup-frame"]')).toBeAttached({timeout: 1000});

            // Use the frameLocator to interact with elements inside the frame
            const portalFrameLocator = await sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await portalFrameLocator.locator('.gh-portal-offer-title').waitFor();

            // check offer details are shown on portal page
            await expect(portalFrameLocator.locator('.gh-portal-offer-title'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrameLocator.locator('text=10% off for first 3 months.'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrameLocator.locator('text=$5.40'), 'URL should open Portal with discount offer').toBeVisible();

            // fill member details and continue
            await portalFrameLocator.locator('#input-name').fill('Testy McTesterson');
            await portalFrameLocator.locator('#input-email').fill('testy+multi@example.com');
            await portalFrameLocator.getByRole('button', {name: 'Continue'}).click();

            // check newsletter selection if shown and continue
            const hasContinueBtn = await portalFrameLocator.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrameLocator.getByRole('button', {name: 'Continue'}).click();
            }

            // complete stripe subscription
            await completeStripeSubscription(sharedPage);

            // wait for site to load and open portal
            await portalTriggerButton.click();

            // Discounted price should not be visible for member for one-time offers
            await expect(portalFrameLocator.locator('text=$5.40/month'), 'Portal should show discounted price').toBeVisible();
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(await sharedPage.getByRole('link', {name: 'Testy McTesterson testy+multi@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(await sharedPage.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
        });

        test('Creates and uses a forever discount Offer', async ({sharedPage}) => {
            // reset members by deleting all existing
            await sharedPage.goto('/ghost');
            await deleteAllMembers(sharedPage);

            // add tier
            const tierName = 'Forever Tier';
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Creates a one-time discount offer for 10% off
            const {offerName, offerLink} = await createOffer(sharedPage, {
                name: 'Black Friday Special',
                tierName: tierName,
                offerType: 'discount',
                discountType: 'forever',
                amount: 10
            });

            // check that offer was added in the offer list screen
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();
            await expect(sharedPage.getByTestId('offers')).toContainText(offerName);

            await sharedPage.goto(offerLink);

            // Wait for the load state to ensure the page has loaded completely
            await sharedPage.waitForLoadState('load');

            // Wait for the load state to ensure the page has loaded completely
            let portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            await expect(portalTriggerButton).toBeVisible();

            // Wait for the iframe to be attached to the DOM
            await expect(sharedPage.locator('[data-testid="portal-popup-frame"]')).toBeAttached({timeout: 1000});

            // Use the frameLocator to interact with elements inside the frame
            const portalFrameLocator = await sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await portalFrameLocator.locator('.gh-portal-offer-title').waitFor();

            // check offer details are shown on portal page
            await expect(portalFrameLocator.locator('.gh-portal-offer-title'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrameLocator.locator('text=10% off forever.'), 'URL should open Portal with discount offer').toBeVisible();
            await expect(portalFrameLocator.locator('text=$5.40'), 'URL should open Portal with discount offer').toBeVisible();

            // fill member details and continue
            await portalFrameLocator.locator('#input-name').fill('Testy McTesterson');
            await portalFrameLocator.locator('#input-email').fill('testy+forever@example.com');
            await portalFrameLocator.getByRole('button', {name: 'Continue'}).click();

            // check if newsletter selection page is shown and continue
            const hasContinueBtn = await portalFrameLocator.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrameLocator.getByRole('button', {name: 'Continue'}).click();
            }
            await completeStripeSubscription(sharedPage);

            // wait for site to load and open portal
            await portalTriggerButton.click();

            // Discounted price should be visible for member for forever offers
            await expect(portalFrameLocator.locator('text=$5.40/month'), 'Portal should show discounted price').toBeVisible();
            await sharedPage.goto('/ghost');
            await sharedPage.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(await sharedPage.getByRole('link', {name: 'Testy McTesterson testy+forever@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(await sharedPage.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
        });

        test('Archiving an offer', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');

            // Create a new tier to attach offer to
            const tierName = 'Archive Test Tier';
            await createTier(sharedPage, {
                name: tierName,
                monthlyPrice: 6,
                yearlyPrice: 60
            });

            // Create an offer. This will be archived
            const {offerLink} = await createOffer(sharedPage, {
                name: 'To be archived',
                tierName: tierName,
                offerType: 'discount',
                amount: 10
            });

            // Archive all existing offers by creating a new offer. Using the createOffer util auto-archives all existing offers
            await createOffer(sharedPage, {
                name: 'Dummy Active Offer',
                tierName: tierName,
                offerType: 'discount',
                amount: 10
            });
            // Open the offer URL and make sure portal popup doesn't load
            await sharedPage.goto(offerLink);
            const portalPopup = await sharedPage.locator('[data-testid="portal-popup-frame"]').isVisible();
            await expect(portalPopup).toBeFalsy();
        });
    });
});
