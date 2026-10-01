import { BillingPage, SidebarPage } from '@/helpers/pages';
import { expect, test } from '@/helpers/playwright';

const MOCK_BILLING_URL = 'https://billing.mock.test';

// Reports ready on the overview, then moves to the plans page the way the
// billing app's own navigation does.
const BMA_HTML = `
<!DOCTYPE html>
<html>
<head><title>Billing</title></head>
<body>
<h1>Billing overview</h1>
<script>
    window.parent.postMessage({ request: 'billingAppReady', route: '/' }, '*');
    window.parent.postMessage({ route: '/plans' }, '*');
</script>
</body>
</html>
`;

// The owner's round trip into the billing app with either shell running it.
for (const { shell, billingReact } of [
  { shell: 'Ember', billingReact: false },
  { shell: 'React', billingReact: true },
] as const) {
  test.describe(`Ghost Admin - Ghost(Pro) billing (${shell})`, () => {
    test.use({
      labs: { billingReact },
      config: {
        hostSettings__billing__enabled: 'true',
        hostSettings__billing__url: MOCK_BILLING_URL,
      },
    });

    test.beforeEach(async ({ page }) => {
      await page.route(`${MOCK_BILLING_URL}/**`, async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html', body: BMA_HTML });
      });
    });

    test('opens from the sidebar and follows the billing app route', async ({ page }) => {
      const sidebarPage = new SidebarPage(page);
      const billingPage = new BillingPage(page);
      await sidebarPage.goto();

      await sidebarPage.getNavLink('Ghost\\(Pro\\)').click();

      const billingIframe = await billingPage.waitForBillingIframe();
      await expect(billingIframe).toBeVisible();
      await expect(page).toHaveURL(/#\/pro\/plans$/);

      await sidebarPage.getNavLink('Posts').click();
      await expect(page).toHaveURL(/#\/posts/);
      await expect(billingIframe).toBeHidden();
    });
  });
}
