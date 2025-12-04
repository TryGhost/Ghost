import {AnalyticsWebTrafficPage} from '@/admin-pages';
import {HomePage} from '@/public-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

test.describe('Ghost Admin - Web Filters', () => {
    test.describe('utmTracking flag disabled', () => {
        test('filter ui hidden when flag disabled', async ({page}) => {
            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();

            await expect(webTrafficPage.filterContainer).toBeHidden();
        });
    });

    test.describe('utmTracking flag enabled', () => {
        test.use({labs: {utmTracking: true}});

        test('filter ui visible when flag enabled', async ({page}) => {
            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();

            await expect(webTrafficPage.filterContainer).toBeVisible();
            await expect(webTrafficPage.filterButton).toBeVisible();
        });

        test('filter popover shows available filter fields', async ({page}) => {
            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();
            await webTrafficPage.openFilterPopover();

            await expect(webTrafficPage.getFilterOption('UTM Source')).toBeVisible();
            await expect(webTrafficPage.getFilterOption('UTM Medium')).toBeVisible();
            await expect(webTrafficPage.getFilterOption('UTM Campaign')).toBeVisible();
            await expect(webTrafficPage.getFilterOption('Source')).toBeVisible();
        });

        test('selecting filter field shows value options with visit counts', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();
            await webTrafficPage.openFilterPopover();
            await webTrafficPage.selectFilterField('Source');

            const directOption = webTrafficPage.getFilterValue('Direct');
            await expect(directOption).toBeVisible();
            await expect(directOption).toContainText(/\d+/);
        });

        test('click on source row adds source filter', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();
            await expect(webTrafficPage.topSourcesCard).toContainText('Direct');

            await webTrafficPage.clickSourceToFilter('direct');

            await expect(webTrafficPage.getActiveFilter('Source')).toBeVisible();
        });

        test('filter persists in url', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();
            await expect(webTrafficPage.topSourcesCard).toContainText('Direct');

            await webTrafficPage.clickSourceToFilter('direct');

            const url = new URL(page.url());
            expect(url.searchParams.has('source')).toBe(true);
        });

        test('can remove filter', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();
            await expect(webTrafficPage.topSourcesCard).toContainText('Direct');

            await webTrafficPage.clickSourceToFilter('direct');
            await expect(webTrafficPage.getActiveFilter('Source')).toBeVisible();

            await webTrafficPage.removeFilter('Source');

            await expect(webTrafficPage.getActiveFilter('Source')).toBeHidden();
        });

        test('filtering shows only matching data', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();
            await expect(webTrafficPage.topSourcesCard).toContainText('Direct');

            await webTrafficPage.clickSourceToFilter('direct');

            await expect(webTrafficPage.topSourcesCard).toContainText('Direct');
            await expect(webTrafficPage.totalUniqueVisitorsTab).not.toContainText('0');
        });

        test('removing filter restores original data', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const webTrafficPage = new AnalyticsWebTrafficPage(page);
            await webTrafficPage.goto();
            await expect(webTrafficPage.topSourcesCard).toContainText('Direct');

            await webTrafficPage.clickSourceToFilter('direct');
            await expect(webTrafficPage.getActiveFilter('Source')).toBeVisible();

            await webTrafficPage.removeFilter('Source');

            await expect(webTrafficPage.topSourcesCard).toContainText('Direct');
        });
    });
});
