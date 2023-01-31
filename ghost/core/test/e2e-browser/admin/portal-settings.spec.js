const {expect, test} = require('@playwright/test');

test.describe('Portal Settings', () => {
    test.describe('Links', () => {
        test('can open portal on default page', async ({page}) => {
            await page.goto('/ghost');
            // Navigate to the member settings
            await page.locator('[data-test-nav="settings"]').click();
            await page.locator('[data-test-nav="members-membership"]').click();

            // open portal settings
            await page.locator('[data-test-toggle="portal-settings"]').click();

            // open links preview page
            await page.locator('[data-test-select="page-selector"]').first().selectOption('links');

            // fetch portal default url from input
            const portalUrl = await page.locator('[data-test-input="portal-link-default"]').inputValue();
            await page.goto(portalUrl);

            const portalFrame = page.locator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
        });

        test('can open portal on signin page', async ({page}) => {
            await page.goto('/ghost');
            // Navigate to the member settings
            await page.locator('[data-test-nav="settings"]').click();
            await page.locator('[data-test-nav="members-membership"]').click();

            // open portal settings
            await page.locator('[data-test-toggle="portal-settings"]').click();

            // open links preview page
            await page.locator('[data-test-select="page-selector"]').first().selectOption('links');

            // fetch portal signin url from input
            const portalUrl = await page.locator('[data-test-input="portal-link-signin"]').inputValue();
            await page.goto(portalUrl);

            const portalFrame = page.locator('[data-testid="portal-popup-frame"]');
            const portalFrameLocator = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
            // check signin page is opened in portal
            await expect(portalFrameLocator.getByRole('heading', {name: 'Sign in'})).toBeVisible();
        });

        test('can open portal on signup page', async ({page}) => {
            await page.goto('/ghost');
            // Navigate to the member settings
            await page.locator('[data-test-nav="settings"]').click();
            await page.locator('[data-test-nav="members-membership"]').click();

            // open portal settings
            await page.locator('[data-test-toggle="portal-settings"]').click();

            // open links preview page
            await page.locator('[data-test-select="page-selector"]').first().selectOption('links');

            // fetch portal signup url from input
            const portalUrl = await page.locator('[data-test-input="portal-link-signup"]').inputValue();
            await page.goto(portalUrl);

            const portalFrame = page.locator('[data-testid="portal-popup-frame"]');
            const portalFrameLocator = page.frameLocator('[data-testid="portal-popup-frame"]');

            // check portal popup is opened
            await expect(portalFrame).toBeVisible();
            // check signup page is opened in portal
            await expect(portalFrameLocator.locator('.gh-portal-signup')).toBeVisible();
        });

        test('can open portal directly on monthly signup', async ({page}) => {
            await page.goto('/ghost');
            // Navigate to the member settings
            await page.locator('[data-test-nav="settings"]').click();
            await page.locator('[data-test-nav="members-membership"]').click();

            // open portal settings
            await page.locator('[data-test-toggle="portal-settings"]').click();

            // open links preview page
            await page.locator('[data-test-select="page-selector"]').first().selectOption('links');

            // fetch and go to portal directly monthly signup url
            const portalUrl = await page.locator('[data-test-input="portal-tier-link-monthly"]').inputValue();
            await page.goto(portalUrl);

            // expect stripe checkout to have opeened
            await page.waitForURL(/^https:\/\/checkout.stripe.com/);
        });

        test('can open portal directly on yearly signup', async ({page}) => {
            await page.goto('/ghost');
            // Navigate to the member settings
            await page.locator('[data-test-nav="settings"]').click();
            await page.locator('[data-test-nav="members-membership"]').click();

            // open portal settings
            await page.locator('[data-test-toggle="portal-settings"]').click();

            // open links preview page
            await page.locator('[data-test-select="page-selector"]').first().selectOption('links');

            // fetch and go to portal directly monthly signup url
            const portalUrl = await page.locator('[data-test-input="portal-tier-link-yearly"]').inputValue();
            await page.goto(portalUrl);

            // expect stripe checkout to have opeened
            await page.waitForURL(/^https:\/\/checkout.stripe.com/);
        });
    });
});
