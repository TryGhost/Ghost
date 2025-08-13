import {test, expect} from '@playwright/test';
import {AnalyticsWebTrafficPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - Analytics Web Traffic', () => {
    test('empty web traffic general graph', async ({page}) => {
      const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
      await analyticsWebTrafficPage.goto();

      await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toContainText('0');
      await expect(analyticsWebTrafficPage.totalViewsTab).toContainText('0');
  });

  test('empty top content card', async ({page}) => {
    const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
    await analyticsWebTrafficPage.goto();

    await expect(analyticsWebTrafficPage.topContentCard).toContainText('No visitors');
  });

  test('empty top content card - posts', async ({page}) => {
    const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
    await analyticsWebTrafficPage.goto();
    await analyticsWebTrafficPage.postsButton.click();

    await expect(analyticsWebTrafficPage.topContentCard).toContainText('No visitors');
  });

  test('empty top content card - pages', async ({page}) => {
    const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
    await analyticsWebTrafficPage.goto();
    await analyticsWebTrafficPage.pagesButton.click();

    await expect(analyticsWebTrafficPage.topContentCard).toContainText('No visitors');
  });

  test('empty top sources card', async ({page}) => {
    const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
    await analyticsWebTrafficPage.goto();

    await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('No visitors');
  });
});