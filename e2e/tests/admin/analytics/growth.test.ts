import { AnalyticsGrowthPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

// The growth family's server journey: a fresh site must return a zero-filled
// member count history (members-stats zero-fill contract) so the growth view
// renders instead of collapsing. The empty-state UI variations live in the
// admin acceptance tier, which fakes this contract and depends on it holding.
test.describe('Ghost Admin - Growth', () => {
  test('renders the growth view with zeroed KPIs on a fresh site', async ({ page }) => {
    const growthPage = new AnalyticsGrowthPage(page);
    await growthPage.goto();

    await expect(growthPage.totalMembersCard).toBeVisible();
    await expect(growthPage.totalMembersCard).toContainText('0');
    await expect(growthPage.topContent.contentCard).toContainText('No conversions');
  });
});
