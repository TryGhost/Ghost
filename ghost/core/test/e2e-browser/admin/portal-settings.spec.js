const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

test.describe('Portal Settings', () => {
    test.describe('Links', () => {
        const openPortalLinks = async (sharedPage) => {
            await sharedPage.goto('/ghost');
            await sharedPage.getByRole('navigation').getByRole('link', {name: 'Settings'}).click();

            await sharedPage.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

            const modal = sharedPage.getByTestId('portal-modal');

            await modal.getByRole('tab', {name: 'Links'}).click();

            return modal;
        };

        test('can open portal on default page', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            // fetch portal default url from input
            const portalUrl = await modal.getByLabel('Default:').inputValue();
            await sharedPage.goto(portalUrl);

            const portalFrame = sharedPage.locator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
        });

        test('can open portal on signin page', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            // fetch portal signin url from input
            const portalUrl = await modal.getByLabel('Sign in').inputValue();
            await sharedPage.goto(portalUrl);

            const portalFrame = sharedPage.locator('[data-testid="portal-popup-frame"]');
            const portalFrameLocator = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
            // check signin page is opened in portal
            await expect(portalFrameLocator.getByRole('heading', {name: 'Sign in'})).toBeVisible();
        });

        test('can open portal on signup page', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            // fetch portal signup url from input
            const portalUrl = await modal.getByLabel('Sign up').inputValue();
            await sharedPage.goto(portalUrl);

            const portalFrame = sharedPage.locator('[data-testid="portal-popup-frame"]');
            const portalFrameLocator = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
            // check signup page is opened in portal
            await expect(portalFrameLocator.locator('.gh-portal-signup')).toBeVisible();
        });

        test('can open portal directly on monthly signup', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            // fetch and go to portal directly monthly signup url
            const portalUrl = await modal.getByLabel('Signup / Monthly').inputValue();
            await sharedPage.goto(portalUrl);

            // expect stripe checkout to have opeened
            await sharedPage.waitForURL(/^https:\/\/checkout.stripe.com/);
        });

        test('can open portal directly on yearly signup', async ({sharedPage}) => {
            const modal = await openPortalLinks(sharedPage);

            // fetch and go to portal directly yearly signup url
            const portalUrl = await modal.getByLabel('Signup / Yearly').inputValue();
            await sharedPage.goto(portalUrl);

            // expect stripe checkout to have opeened
            await sharedPage.waitForURL(/^https:\/\/checkout.stripe.com/);
        });
    });
});
