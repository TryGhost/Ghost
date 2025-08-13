import {test, expect} from '@playwright/test';
import {AnalyticsOverviewPage, AnalyticsWebTrafficPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - Analytics Overview', () => {
    test('latest post', async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        const membersCount = await analyticsOverviewPage.latestPost.membersCount();
        const visitorsCount = await analyticsOverviewPage.latestPost.visitorsCount();

        await expect(analyticsOverviewPage.latestPost.post).toBeVisible();
        expect(visitorsCount).toContain('0');
        expect(membersCount).toContain('0');
    });

    test('view more unique visitors details', async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        await analyticsOverviewPage.viewMoreUniqueVisitorDetails();

        const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
        await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toBeVisible();
    });
});

