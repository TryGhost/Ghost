import {
    AnalyticsOverviewPage,
    MembersPage,
    PostAnalyticsGrowthPage,
    PostAnalyticsPage
} from '../../../../helpers/pages/admin';
import {expect, test} from '../../../../helpers/playwright';

test.describe('Ghost Admin - Post Analytics - Growth', () => {
    test.beforeEach(async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await analyticsOverviewPage.latestPost.analyticsButton.click();

        // TODO: check post analytics component, we shouldn't need to wait on page load to be able to click growth link
        const postAnalyticsPage = new PostAnalyticsPage(page);
        await postAnalyticsPage.waitForPageLoad();
        await postAnalyticsPage.growthButton.click();
    });

    test('empty members card', async ({page}) => {
        const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);

        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('Free members');
        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('0');
    });

    test('empty members card - view member', async ({page}) => {
        const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);
        await postAnalyticsPageGrowthPage.viewMemberButton.click();

        const membersPage = new MembersPage(page);
        await expect(membersPage.body).toContainText('No members match');
    });

    test('empty top sources card', async ({page}) => {
        const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);

        await expect(postAnalyticsPageGrowthPage.topSourcesCard).toContainText('No sources data available');
    });
});

