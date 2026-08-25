import { BillingPage, SidebarPage } from '@/helpers/pages';
import { expect, test } from '@/helpers/playwright';

const MOCK_BILLING_URL = 'https://billing.mock.test';

const DUNNING_BMA_HTML = `
<!DOCTYPE html>
<html>
<head><title>Billing</title></head>
<body>
<script>
    window.parent.postMessage({
        isGrace: true,
        subscription: {
            isActiveTrial: false,
            status: 'past_due'
        },
        user: {
            payment_attempts: 3
        }
    }, '*');
</script>
</body>
</html>
`;

test.describe('Ghost Admin - Dunning Intervention', () => {
  test.use({
    config: {
      hostSettings__billing__enabled: 'true',
      hostSettings__billing__url: MOCK_BILLING_URL,
      hostSettings__forceUpgrade: 'false',
    },
  });

  test.beforeEach(async ({ page }) => {
    await page.route(`${MOCK_BILLING_URL}/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: DUNNING_BMA_HTML,
      });
    });
    await page.reload();
    await expect(
      page.getByText('Your billing details need updating.', { exact: false }),
    ).toBeVisible();
  });

  test('shows the reminder once per Admin load while retaining the overdue banner', async ({
    page,
  }) => {
    const sidebarPage = new SidebarPage(page);
    const billingPage = new BillingPage(page);
    const reminder = page.getByRole('dialog', { name: 'Your payment has failed 3 times' });
    const overdueBanner = page.getByText('Your billing details need updating.', { exact: false });

    await sidebarPage.goto('/ghost/#/posts');

    await expect(reminder).toBeVisible();
    await expect(overdueBanner).toBeVisible();

    await reminder.getByRole('button', { name: 'Dismiss for now' }).click();
    await expect(reminder).toBeHidden();
    await expect(overdueBanner).toBeVisible();

    await sidebarPage.getNavLink('Members').click();
    await expect(page).toHaveURL(/#\/members/);
    await expect(reminder).toBeHidden();
    await expect(overdueBanner).toBeVisible();

    await page.reload();
    await expect(reminder).toBeVisible();

    await reminder.getByRole('button', { name: 'Update payment details' }).click();
    await expect(reminder).toBeHidden();
    await expect(page).toHaveURL(/#\/pro/);
    await expect(await billingPage.waitForBillingIframe()).toBeVisible();
  });

  test('leaves payment recovery to Billing on the Pro route', async ({ page }) => {
    const sidebarPage = new SidebarPage(page);
    const billingPage = new BillingPage(page);
    const reminder = page.getByRole('dialog', { name: 'Your payment has failed 3 times' });

    await sidebarPage.goto('/ghost/#/pro');

    await expect(page).toHaveURL(/#\/pro/);
    await expect(await billingPage.waitForBillingIframe()).toBeVisible();
    await expect(reminder).toBeHidden();
    await expect(
      page.getByText('Your billing details need updating.', { exact: false }),
    ).toBeVisible();
  });
});
