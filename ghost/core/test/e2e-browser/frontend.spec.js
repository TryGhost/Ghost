const {expect, test} = require('@playwright/test');
const {setupGhost, deleteAllMembers, createTier, createOffer, completeStripeSubscription} = require('./utils');

test.describe('Ghost Frontend', () => {
    test.describe('Basic frontend', () => {
        test('Loads the homepage', async ({page}) => {
            const response = await page.goto('/');
            expect(response.status()).toEqual(200);
        });
    });

    test.describe('Portal flows', () => {
        test('Uses an offer successfully', async ({page}) => {
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
                percentOff: 10
            });

            await page.locator('.gh-offers-list .gh-list-row').filter({hasText: offerName}).click();
            const portalUrl = await page.locator('input#url').inputValue();

            await page.goto(portalUrl);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            await completeStripeSubscription(page);

            await page.waitForSelector('h1.site-title', {state: 'visible'});
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(page.getByRole('link', {name: 'Testy McTesterson testy@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(page.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
        });
    });
});
