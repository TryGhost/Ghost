import {BillingPage, NAV_ITEMS, SidebarPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

const MOCK_BILLING_URL = 'https://billing.mock.test';

const FORCE_UPGRADE_BMA_HTML = `
<!DOCTYPE html>
<html>
<head><title>Upgrade Required</title></head>
<body>
<h1 data-testid="force-upgrade-prompt">Upgrade Required</h1>
<script>
    window.addEventListener('message', (event) => {
        if (event.data?.request === 'forceUpgradeInfo') {
            console.log('Force upgrade info requested');
        }
        if (event.data?.request === 'token') {
            console.log('Token requested');
        }
    });

    window.parent.postMessage({
        subscription: {
            isActiveTrial: false,
            status: 'past_due'
        }
    }, '*');
</script>
</body>
</html>
`;

usePerTestIsolation();

test.describe('Ghost Admin - Force Upgrade Mode', () => {
    test.use({
        config: {
            hostSettings__forceUpgrade: 'true',
            hostSettings__billing__enabled: 'true',
            hostSettings__billing__url: MOCK_BILLING_URL
        }
    });

    test.beforeEach(async ({page}) => {
        await page.route(`${MOCK_BILLING_URL}/**`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: FORCE_UPGRADE_BMA_HTML
            });
        });
    });

    test('sidebar navigation is blocked by billing iframe', async ({page}) => {
        const sidebarPage = new SidebarPage(page);
        const billingPage = new BillingPage(page);
        await sidebarPage.goto();

        const billingIframe = await billingPage.waitForBillingIframe();
        await expect(billingIframe).toBeVisible();

        for (const {name} of NAV_ITEMS) {
            await sidebarPage.getNavLink(name).click();
            await expect(billingIframe).toBeVisible();
        }
    });

    test('direct URL navigation is blocked by billing iframe', async ({page}) => {
        const sidebarPage = new SidebarPage(page);
        const billingPage = new BillingPage(page);

        for (const {directUrl} of NAV_ITEMS) {
            await sidebarPage.goto(directUrl);

            const billingIframe = await billingPage.waitForBillingIframe();
            await expect(billingIframe).toBeVisible();
        }
    });

    test('Settings is accessible via sidebar', async ({page}) => {
        const sidebarPage = new SidebarPage(page);
        const billingPage = new BillingPage(page);
        await sidebarPage.goto();

        await billingPage.waitForBillingIframe();
        await sidebarPage.getNavLink('Settings').click();

        await expect(page).toHaveURL(/#\/settings/);
        await expect(billingPage.billingIframe).toBeHidden();
    });

    test('Settings is accessible via direct URL', async ({page}) => {
        const sidebarPage = new SidebarPage(page);
        const billingPage = new BillingPage(page);
        await sidebarPage.goto('/ghost/#/settings');

        await expect(page).toHaveURL(/#\/settings/);
        await expect(billingPage.billingIframe).toBeHidden();
    });

    test('Sign out is accessible', async ({page}) => {
        const sidebarPage = new SidebarPage(page);
        const billingPage = new BillingPage(page);
        await sidebarPage.goto();

        await billingPage.waitForBillingIframe();
        await sidebarPage.userDropdownTrigger.click();
        await sidebarPage.signOutLink.click();

        await expect(page).toHaveURL(/signin/);
    });

    test('Ember-handled tag detail route shows billing iframe', async ({page}) => {
        const sidebarPage = new SidebarPage(page);
        const billingPage = new BillingPage(page);
        await sidebarPage.goto('/ghost/#/tags/default-tag');

        const billingIframe = await billingPage.waitForBillingIframe();
        await expect(billingIframe).toBeVisible();
    });
});
