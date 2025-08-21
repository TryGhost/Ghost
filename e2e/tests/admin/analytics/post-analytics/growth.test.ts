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
        await analyticsOverviewPage.latestPost.analyticsButton.click();

        const postAnalyticsPage = new PostAnalyticsPage(page);
        // TODO: check post analytics component, we shouldn't need to wait on page load to be able to click growth link
        await postAnalyticsPage.waitForPageLoad();
        await postAnalyticsPage.growth();

        postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);
    });

    test('empty members card', async ({}) => {
        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('Free members');
        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('0');
    });

    test('empty members card - view member', async ({page}) => {
        await postAnalyticsPageGrowthPage.viewMemberButton.click();

        const membersPage = new MembersPage(page);
        await expect(membersPage.body).toContainText('No members match');
    });

    test('empty top sources card', async ({}) => {
        await expect(postAnalyticsPageGrowthPage.topSourcesCard).toContainText('No sources data available');
    });
});

