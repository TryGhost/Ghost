import {PostAnalyticsWebTrafficPage, PostsPage} from '@/admin-pages';
import {PublicPage} from '@/public-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

test.describe('Ghost Admin - Page Analytics', () => {
    test('page view from pages list - appears in page analytics trend', async ({page, browser, baseURL}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
            const aboutPage = new PublicPage(publicPage);
            await aboutPage.goto('/about/');
        });

        const pagesList = new PostsPage(page);
        await pagesList.goto('/ghost/#/pages');
        await expect(pagesList.getWebTrafficMetricForPost('About this site')).toContainText('1');

        await pagesList.getWebTrafficLinkForPost('About this site').click();

        const pageAnalytics = new PostAnalyticsWebTrafficPage(page);
        await expect(page).toHaveURL(/\/ghost\/#\/pages\/analytics\/[^/]+\/web/);
        await pageAnalytics.totalViewsKpi.click();
        await expect(pageAnalytics.webTrafficChart).toContainText('1');
    });
});
