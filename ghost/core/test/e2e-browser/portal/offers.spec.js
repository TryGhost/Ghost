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

            await page.locator('.gh-offers-list .gh-list-row').filter({hasText: offerName}).click();
            const portalUrl = await page.locator('input#url').inputValue();

            await page.goto(portalUrl);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');
            await portalFrame.locator('#input-name').fill('Testy McTesterson');
            await portalFrame.locator('#input-email').fill('testy@example.com');
            await portalFrame.getByRole('button', {name: 'Start 14-day free trial'}).click();

            await completeStripeSubscription(page);

            await page.waitForSelector('h1.site-title', {state: 'visible'});
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();

            // 1 member, should be Testy, on Portal Tier
            await expect(page.getByRole('link', {name: 'Testy McTesterson testy@example.com'}), 'Should have 1 paid member').toBeVisible();
            await expect(page.getByRole('link', {name: tierName}), `Paid member should be on ${tierName}`).toBeVisible();
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
