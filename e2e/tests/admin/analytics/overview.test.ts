import {test, expect} from '@playwright/test';
import {
    AnalyticsOverviewPage,
    AnalyticsWebTrafficPage,
    AnalyticsGrowthPage
} from '../../../helpers/pages/admin';

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

    test('top posts', async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        await expect(analyticsOverviewPage.topPosts.post).toBeVisible();

        const visitorsStatistics = await analyticsOverviewPage.topPosts.uniqueVisitorsStatistics();
        const membersStatistics = await analyticsOverviewPage.topPosts.membersStatistics();

        expect(visitorsStatistics).toContain('Unique visitors');
        expect(visitorsStatistics).toContain('0');
        expect(membersStatistics).toContain('New members');
        expect(membersStatistics).toContain('Free');
        expect(membersStatistics).toContain('0');
    });

    test('view more unique visitors details', async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        await analyticsOverviewPage.viewMoreUniqueVisitorDetails();

        const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
        await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toBeVisible();
    });

    test('view more members details', async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        await analyticsOverviewPage.viewMoreMembersDetails();

        const analyticsGrowthPage = new AnalyticsGrowthPage(page);
        await expect(analyticsGrowthPage.totalMembersCard).toBeVisible();
    });
});

