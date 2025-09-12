import {test, expect} from '../../../helpers/playwright';
import {
    AnalyticsOverviewPage,
    AnalyticsWebTrafficPage,
    AnalyticsGrowthPage
} from '../../../helpers/pages/admin';
import {HomePage} from '../../../helpers/pages/public';

test.describe('Ghost Admin - Analytics Overview', () => {
    test('records visitor when homepage is visited', async ({page, browser, baseURL}) => {
        // Create a new browser context for visiting the public site
        // Ghost does not send tracking requests if it detects that it is running in a test environment, i.e. playwright
        // We can override this by setting window.__GHOST_SYNTHETIC_MONITORING__ to true
        // This allows us to test page hit tracking in our e2e tests
        const publicContext = await browser.newContext({
            baseURL: baseURL
        });
        const publicPage = await publicContext.newPage();
        await publicPage.addInitScript(() => {
            window.__GHOST_SYNTHETIC_MONITORING__ = true;
        });

        // Visit the homepage to generate a page hit, then close the context
        const homePage = new HomePage(publicPage);
        await homePage.goto();
        await expect(homePage.title).toBeVisible();
        await publicPage.waitForLoadState('networkidle');
        await publicContext.close();

        // Navigate to the analytics overview page in Ghost Admin
        // Reload to ensure we fetch the latest data from Tinybird
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await page.reload();
        await expect(analyticsOverviewPage.header).toBeVisible();
        await page.waitForLoadState('networkidle');

        expect(await analyticsOverviewPage.uniqueVisitors.count()).toBe(1);
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

