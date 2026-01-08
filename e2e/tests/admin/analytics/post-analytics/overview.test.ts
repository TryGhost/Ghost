import {
    AnalyticsOverviewPage,
    PostAnalyticsGrowthPage,
    PostAnalyticsPage,
    PostAnalyticsWebTrafficPage
} from '@/admin-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

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

    test('Growth tab is hidden when member sources tracking is disabled', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        const postAnalyticsPage = new PostAnalyticsPage(page);

        // Initially, Growth tab should be visible (member sources enabled by default)
        await expect(postAnalyticsPage.growthButton).toBeVisible();

        // Disable member source tracking
        await settingsService.setMembersTrackSources(false);

        // Reload the page to apply the setting
        await page.reload();

        // Growth tab should now be hidden
        await expect(postAnalyticsPage.growthButton).toBeHidden();

        // Overview and Web traffic tabs should still be visible
        await expect(postAnalyticsPage.overviewButton).toBeVisible();
        await expect(postAnalyticsPage.webTrafficButton).toBeVisible();

        // Re-enable member source tracking
        await settingsService.setMembersTrackSources(true);

        // Reload the page to apply the setting
        await page.reload();

        // Growth tab should be visible again
        await expect(postAnalyticsPage.growthButton).toBeVisible();
    });
});

