const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

test.describe('Portal Settings', () => {
    test.describe('Links', () => {
        const openPortalLinks = async (page) => {
            await page.goto('/ghost');
            await page.locator('[data-test-nav="settings"]').click();

            await page.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('portal-modal');

            await modal.getByRole('tab', {name: 'Links'}).click();

            return modal;
        };

        test('can open portal on default page', async ({page}) => {
            const modal = await openPortalLinks(page);

            // fetch portal default url from input
            const portalUrl = await modal.getByLabel('Default').inputValue();
            await page.goto(portalUrl);

            const portalFrame = page.locator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
        });

        test('can open portal on signin page', async ({page}) => {
            const modal = await openPortalLinks(page);

            // fetch portal signin url from input
            const portalUrl = await modal.getByLabel('Sign in').inputValue();
            await page.goto(portalUrl);

            const portalFrame = page.locator('[data-testid="portal-popup-frame"]');
            const portalFrameLocator = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
            // check signin page is opened in portal
            await expect(portalFrameLocator.getByRole('heading', {name: 'Sign in'})).toBeVisible();
        });

        test('can open portal on signup page', async ({page}) => {
            const modal = await openPortalLinks(page);

            // fetch portal signup url from input
            const portalUrl = await modal.getByLabel('Sign up').inputValue();
            await page.goto(portalUrl);

            const portalFrame = page.locator('[data-testid="portal-popup-frame"]');
            const portalFrameLocator = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
            // check signup page is opened in portal
            await expect(portalFrameLocator.locator('.gh-portal-signup')).toBeVisible();
        });

        test('can open portal directly on monthly signup', async ({page}) => {
            const modal = await openPortalLinks(page);

            // fetch and go to portal directly monthly signup url
            const portalUrl = await modal.getByLabel('Signup / Monthly').inputValue();
            await page.goto(portalUrl);

            // expect stripe checkout to have opeened
            await page.waitForURL(/^https:\/\/checkout.stripe.com/);
        });

        test('can open portal directly on yearly signup', async ({page}) => {
            const modal = await openPortalLinks(page);

            // fetch and go to portal directly yearly signup url
            const portalUrl = await modal.getByLabel('Signup / Yearly').inputValue();
            await page.goto(portalUrl);

            // expect stripe checkout to have opeened
            await page.waitForURL(/^https:\/\/checkout.stripe.com/);
        });
    });
});
