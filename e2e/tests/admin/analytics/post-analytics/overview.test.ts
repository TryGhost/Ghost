import {
    AnalyticsOverviewPage,
    PostAnalyticsGrowthPage,
    PostAnalyticsPage,
    PostAnalyticsWebTrafficPage
} from '../../../../helpers/pages/admin';
import {expect, test} from '../../../../helpers/playwright';

test.describe('Ghost Admin - Post Analytics - Overview', () => {
    test.beforeEach(async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        await analyticsOverviewPage.latestPost.analyticsButton.click();
    });

    test('empty page with all tabs', async ({page}) => {
        const postAnalyticsPage = new PostAnalyticsPage(page);

        await expect(postAnalyticsPage.overviewButton).toBeVisible();
        await expect(postAnalyticsPage.webTrafficButton).toBeVisible();
        await expect(postAnalyticsPage.growthButton).toBeVisible();
    });

    test('empty page - overview - web performance - view more', async ({page}) => {
        const postAnalyticsPage = new PostAnalyticsPage(page);
        await postAnalyticsPage.webPerformanceSection.viewMoreButton.click();

        const postAnalyticsWebTrafficPage = new PostAnalyticsWebTrafficPage(page);
        await expect(postAnalyticsWebTrafficPage.body).toContainText('No visitors in the last 30 days');
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

