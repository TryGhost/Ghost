const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

test.describe('Portal Settings', () => {
    test.describe('Links', () => {
        const openPortalLinks = async (sharedPage) => {
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();

            await sharedPage.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

            const modal = sharedPage.getByTestId('portal-modal');

            await modal.getByRole('tab', {name: 'Links'}).click();

            return modal;
        };

        test('can open portal on default page', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            const portalUrl = await modal.getByLabel('Default:').inputValue();
            await sharedPage.goto(portalUrl);

            const portalFrame = sharedPage.locator('[data-testid="portal-popup-frame"]');

            // Wait for frame to be attached and visible
            await expect(portalFrame).toBeVisible();
        });

        test('can open portal on signin page', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            const portalUrl = await modal.getByLabel('Sign in').inputValue();
            await sharedPage.goto(portalUrl);

            const portalFrame = sharedPage.locator('[data-testid="portal-popup-frame"]');
            
            // Wait for frame to be attached and visible first
            await expect(portalFrame).toBeVisible();
            
            const portalFrameLocator = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            
            // Wait for the frame content to be loaded
            await expect(portalFrameLocator.locator('.gh-portal-signin')).toBeVisible({timeout: 15000});
            await expect(portalFrameLocator.getByRole('heading', {name: 'Sign in'})).toBeVisible({timeout: 15000});
        });

        test('can open portal on signup page', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            const portalUrl = await modal.getByLabel('Sign up').inputValue();
            await sharedPage.goto(portalUrl);

            const portalFrame = sharedPage.locator('[data-testid="portal-popup-frame"]');
            
            // Wait for frame to be attached and visible first
            await expect(portalFrame).toBeVisible();
            
            const portalFrameLocator = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            
            // Wait for the frame content to be loaded
            await expect(portalFrameLocator.locator('.gh-portal-signup')).toBeVisible({timeout: 15000});
        });

        test('can open portal directly on monthly signup', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            const portalUrl = await modal.getByLabel('Signup / Monthly').inputValue();
            await sharedPage.goto(portalUrl);

            // Wait longer for Stripe checkout to load
            await sharedPage.waitForURL(/^https:\/\/checkout.stripe.com/, {timeout: 15000});
        });

        test('can open portal directly on yearly signup', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            const portalUrl = await modal.getByLabel('Signup / Yearly').inputValue();
            await sharedPage.goto(portalUrl);

            // Wait longer for Stripe checkout to load
            await sharedPage.waitForURL(/^https:\/\/checkout.stripe.com/, {timeout: 15000});
        });
    });
});
