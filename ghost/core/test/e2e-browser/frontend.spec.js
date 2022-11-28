const {expect, test} = require('@playwright/test');
const {setupGhost, setupStripe, createTier, createOffer, completeStripeSubscription} = require('./utils');

test.describe('Ghost Frontend', () => {
    test.beforeEach(async ({page}) => {
        await setupGhost(page);
    });

    test.describe('Basic frontend', () => {
        test('Loads the homepage', async ({page}) => {
            const response = await page.goto('/');
            expect(response.status()).toEqual(200);
        });
    });

    test.describe('Portal flows', () => {
        test('Uses an offer successfully', async ({page}) => {
            await setupStripe(page);
            await createTier(page, {
                name: 'Portal Tier',
                monthlyPrice: 6,
                yearlyPrice: 60
            });
            const offerName = await createOffer(page, {
                name: 'Black Friday Special',
                tierName: 'Portal Tier',
                percentOff: 10
            });

            // TODO: Click on the offer, copy the link, goto the link
            await page.locator('[data-test-list="offer-name"]').filter({hasText: offerName}).click();
            const portalUrl = await page.locator('input#url').inputValue();

            await page.goto(portalUrl);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            await completeStripeSubscription(page);

            // Wait for success notification to say we have subscribed successfully
            const gotNotification = await page.frameLocator('iframe >> nth=1').getByText('Success! Check your email for magic link').waitFor({
                state: 'visible',
                timeout: 10000
            }).then(() => true).catch(() => false);
            test.expect(gotNotification, 'Did not get portal success notification').toBeTruthy();
        });
    });
});
