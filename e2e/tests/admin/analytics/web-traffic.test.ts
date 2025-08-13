import {test, expect} from '@playwright/test';
import {AnalyticsWebTrafficPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - Analytics Web Traffic', () => {
    test('empty web traffic general graph', async ({page}) => {
      const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
      await analyticsWebTrafficPage.goto();

      await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toContainText('0');
      await expect(analyticsWebTrafficPage.totalViewsTab).toContainText('0');
  });
});