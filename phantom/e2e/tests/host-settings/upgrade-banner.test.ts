// Vendored from /e2e/tests/admin/sidebar/upgrade-banner.test.ts. Runs in
// the `billing` project: a phantom server with billing host settings; the
// owner logs in via API instead of shared storage state.
import {SidebarPage} from '../../helpers/pages';
import {expect, test, loginOwnerViaApi} from '../../helpers/fixture';

const MOCK_BILLING_URL = 'https://billing.mock.test';
const BILLING_HTML = `
<!DOCTYPE html>
<html>
<body>
<script>
    window.parent.postMessage({
        subscription: {
            isActiveTrial: true,
            trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'trialing'
        }
    }, '*');
</script>
</body>
</html>
`;

test.describe('Ghost Admin - Upgrade Banner', () => {
    test.beforeEach(async ({page}) => {
        await loginOwnerViaApi(page);
    });

    test('upgrade now button navigates to pro checkout route', async ({page}) => {
        // Mock the billing iframe to send trial subscription data
        // This simulates what the real billing management app does on load
        await page.route(`${MOCK_BILLING_URL}/**`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: BILLING_HTML
            });
        });

        const sidebarPage = new SidebarPage(page);
        await sidebarPage.goto();

        // Act - Click the upgrade link
        await sidebarPage.upgradeNowLink.click();

        // Assert - URL should navigate to the billing plans route
        await expect(page).toHaveURL(/#\/pro\/billing\/plans/);
    });
});
