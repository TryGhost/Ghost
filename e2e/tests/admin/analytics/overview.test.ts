import { AnalyticsOverviewPage } from '@/admin-pages';
import { HomePage } from '@/public-pages';
import { createPostFactory } from '@/data-factory';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';

test.describe('Ghost Admin - Analytics Overview', () => {
  test.beforeEach(async ({ page }) => {
    const postFactory = createPostFactory(page.request);
    await postFactory.create({
      title: 'Analytics overview test post',
      status: 'published',
    });
  });

  test('records visitor when homepage is visited', async ({ page, browser, baseURL }) => {
    await withIsolatedPage(browser, { baseURL }, async ({ page: publicPage }) => {
      const homePage = new HomePage(publicPage);
      await homePage.goto();
    });

    const analyticsOverviewPage = new AnalyticsOverviewPage(page);
    await analyticsOverviewPage.goto();
    await analyticsOverviewPage.refreshData();

    expect(await analyticsOverviewPage.uniqueVisitors.count()).toBe(1);
  });
});
