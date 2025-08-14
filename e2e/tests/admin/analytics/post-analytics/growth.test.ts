import {test, expect} from '@playwright/test';
import {
    AnalyticsOverviewPage, 
    PostAnalyticsPage, 
    PostAnalyticsGrowthPage
} from '../../../../helpers/pages/admin';

test.describe('Ghost Admin - Post Analytics - Growth', () => {
    let postAnalyticsPageGrowthPage: PostAnalyticsGrowthPage;

    test.beforeEach(async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await analyticsOverviewPage.latestPost.viewAnalytics();

        const postAnalyticsPage = new PostAnalyticsPage(page);
        await postAnalyticsPage.growthButton.click();

        postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);
    });

    test('top sources card', async ({page}) => {
        await expect(postAnalyticsPageGrowthPage.topSourcesCard).toContainText('No sources data available');
    });
});

