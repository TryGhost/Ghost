import {test, expect} from '@playwright/test';
import {
    AnalyticsOverviewPage, 
    PostAnalyticsPage, 
    PostAnalyticsGrowthPage
} from '../../../../helpers/pages/admin';

test.describe('Ghost Admin - Post Analytics - Overview', () => {
    let analyticsOverviewPage: AnalyticsOverviewPage;

    test.beforeEach(async ({page}) => {
        analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await analyticsOverviewPage.latestPost.viewAnalytics();
    });

    test('empty page with all tabs', async ({page}) => {
        const postAnalyticsPage = new PostAnalyticsPage(page);
        await expect(postAnalyticsPage.overviewButton).toBeVisible();
        await expect(postAnalyticsPage.webTrafficButton).toBeVisible();
        await expect(postAnalyticsPage.growthButton).toBeVisible();
    });

    test('empty page - overview - growth', async ({page}) => {
        const postAnalyticsPage = new PostAnalyticsPage(page);
        await expect(postAnalyticsPage.growthSection.card).toContainText('Free members');
        await expect(postAnalyticsPage.growthSection.card).toContainText('0');
    });

    test('empty page - overview - growth - view more', async ({page}) => {
        const postAnalyticsPage = new PostAnalyticsPage(page);

        await postAnalyticsPage.growthSection.viewMoreButton.click();

        const postAnalyticsGrowthPage = new PostAnalyticsGrowthPage(page);
        await expect(postAnalyticsGrowthPage.topSourcesCard).toContainText('No sources data available');
    });
});

