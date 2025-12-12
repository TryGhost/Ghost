import {NAV_ITEMS, SidebarPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';

const MOCK_BILLING_URL = 'https://billing.mock.test';

// Mock BMA HTML that simulates force upgrade state
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

    // Send subscription data indicating force upgrade state
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

/**
 * Test suite for force upgrade mode.
 *
 * When forceUpgrade is enabled, users should see the billing iframe
 * instead of normal content. Navigation to blocked routes should show
 * the billing iframe. Only /pro, signout, and settings-x routes are allowed.
 *
 * Test results:
 * - Ember (no React shell): All tests pass ✅
 * - React shell: Some tests fail for React-handled routes
 *
 * Known React shell issues (billing iframe exists but is hidden):
 * - Sidebar: Network link, Tags link
 * - Direct URL: Analytics, Network, Tags
 *
 * These routes are handled by React and bypass the Ember forceUpgrade protection.
 */
test.describe('Ghost Admin - Force Upgrade Mode', () => {
    test.use({
        config: {
            hostSettings__forceUpgrade: 'true',
            hostSettings__billing__enabled: 'true',
            hostSettings__billing__url: MOCK_BILLING_URL
        }
    });

    test.beforeEach(async ({page}) => {
        // Mock the billing iframe for all tests
        await page.route(`${MOCK_BILLING_URL}/**`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: FORCE_UPGRADE_BMA_HTML
            });
        });
    });

    /**
     * Helper to wait for the billing iframe to be visible.
     * In forceUpgrade mode, the billing iframe should appear in the main content area.
     * We check for the iframe element itself since the content may not load in test environment.
     */
    async function waitForBillingIframe(page: import('@playwright/test').Page) {
        // Target the billing iframe specifically (there may be other iframes like Explore)
        const billingIframe = page.locator('iframe[title="Billing"]');
        await billingIframe.waitFor({state: 'visible', timeout: 10000});
        return billingIframe;
    }

    test.describe('sidebar navigation shows billing iframe', () => {
        NAV_ITEMS.forEach(({name}) => {
            test(`${name} link - billing iframe blocks access`, async ({page}) => {
                const sidebarPage = new SidebarPage(page);
                await sidebarPage.goto();

                // Wait for billing iframe to appear (force upgrade kicks in)
                const billingIframe = await waitForBillingIframe(page);
                await expect(billingIframe).toBeVisible();

                // Try to navigate via sidebar link
                const navLink = sidebarPage.getNavLink(name);
                await navLink.click();

                // Billing iframe should still be visible (navigation blocked)
                await expect(billingIframe).toBeVisible();
            });
        });
    });

    test.describe('direct URL navigation blocked', () => {
        NAV_ITEMS.forEach(({name, directUrl}) => {
            test(`direct navigation to ${name} shows billing iframe`, async ({page}) => {
                const sidebarPage = new SidebarPage(page);
                await sidebarPage.goto(directUrl);
                const billingIframe = await waitForBillingIframe(page);
                await expect(billingIframe).toBeVisible();
            });
        });
    });

    test.describe('allowed routes in force upgrade mode', () => {
        test('Settings is accessible', async ({page}) => {
            const sidebarPage = new SidebarPage(page);
            await sidebarPage.goto();

            // Wait for initial billing iframe
            await waitForBillingIframe(page);

            // Navigate to Settings - should be allowed
            await sidebarPage.getNavLink('Settings').click();

            // Settings routes should be accessible - URL should change to settings
            await expect(page).toHaveURL(/#\/settings/);
        });

        test('direct navigation to /settings is allowed', async ({page}) => {
            const sidebarPage = new SidebarPage(page);
            await sidebarPage.goto('/ghost/#/settings');
            // Settings should be allowed - should NOT show billing iframe
            await expect(page).toHaveURL(/#\/settings/);
        });

        test('Sign out is accessible', async ({page}) => {
            const sidebarPage = new SidebarPage(page);
            await sidebarPage.goto();

            // Wait for billing iframe
            await waitForBillingIframe(page);

            // Open user dropdown and click sign out
            await sidebarPage.userDropdownTrigger.click();
            await sidebarPage.signOutLink.click();

            // Should navigate to signin page after logout
            await expect(page).toHaveURL(/signin/);
        });
    });
});
