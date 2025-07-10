import {test, expect} from '@playwright/test';
import {AnalyticsOverviewPage} from '../../helpers/pages/admin';

test.describe('Ghost Admin - Analytics - Overview', () => {
    test('loads correctly', async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        await expect(analyticsOverviewPage.body).toBeVisible();
    });
});
