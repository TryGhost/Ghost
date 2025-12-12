import {
    AnalyticsGrowthPage,
    AnalyticsOverviewPage,
    AnalyticsWebTrafficPage
} from '@/admin-pages';
import {HomePage} from '@/public-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

test.describe('Ghost Admin - Analytics Overview', () => {
    test('records visitor when homepage is visited', async ({page, browser, baseURL}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
            const homePage = new HomePage(publicPage);
            await homePage.goto();
        });

        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await analyticsOverviewPage.refreshData();

        expect(await analyticsOverviewPage.uniqueVisitors.count()).toBe(1);
    });

    test('records multiple pageviews in single session correctly', async ({page, browser, baseURL}) => {
        const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);

        const waitForViewCount = async (expectedCount: string) => {
            await expect.poll(async () => {
                await analyticsWebTrafficPage.refreshData();
                return await analyticsWebTrafficPage.totalViewsTab.textContent();
            }, {timeout: 10000}).toContain(expectedCount);
        };

        const context = await browser.newContext({baseURL});
        const publicBrowserPage = await context.newPage();

        try {
            const homePage = new HomePage(publicBrowserPage);

            await homePage.goto();
            await analyticsWebTrafficPage.goto();
            await waitForViewCount('1');
            await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toContainText('1');

            await homePage.goto();
            await waitForViewCount('2');
            await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toContainText('1');

            await homePage.goto();
            await waitForViewCount('3');
            await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toContainText('1');
        } finally {
            await publicBrowserPage.close();
            await context.close();
        }
    });

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

