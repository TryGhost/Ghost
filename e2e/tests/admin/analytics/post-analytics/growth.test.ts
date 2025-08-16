import {test, expect} from '@playwright/test';
import {
    AnalyticsOverviewPage,
    PostAnalyticsPage,
    PostAnalyticsGrowthPage,
    MembersPage
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

    // TODO: flaky, needs to be fixed
    test.skip('members card', async ({}) => {
        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('Free members');
        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('0');
    });

    // TODO: flaky, needs to be fixed
    test.skip('members card - view member', async ({page}) => {
        await postAnalyticsPageGrowthPage.viewMemberButton.click();

        const membersPage = new MembersPage(page);
        await expect(membersPage.body).toContainText('No members match');
    });

    // TODO: flaky, needs to be fixed
    test.skip('top sources card', async ({}) => {
        await expect(postAnalyticsPageGrowthPage.topSourcesCard).toContainText('No sources data available');
    });
});

