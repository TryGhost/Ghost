import {AnalyticsWebTrafficPage} from '@/admin-pages';
import {HomePage} from '@/public-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

test.describe('Ghost Admin - Analytics UTM Tracking', () => {
    test.describe('utmTracking flag disabled', () => {
        test('filter ui hidden when flag disabled', async ({page}) => {
            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            await expect(analyticsWebTrafficPage.filterContainer).toBeHidden();
        });
    });

    test.describe('utmTracking flag enabled', () => {
        test.use({labs: {utmTracking: true}});

        test('filter ui visible when flag enabled', async ({page}) => {
            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            await expect(analyticsWebTrafficPage.filterContainer).toBeVisible();
            await expect(analyticsWebTrafficPage.filterButton).toBeVisible();
        });

        test('filter popover shows available filter fields', async ({page}) => {
            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await analyticsWebTrafficPage.openFilterPopover();

            await expect(page.getByRole('option', {name: 'UTM Source', exact: true})).toBeVisible();
            await expect(page.getByRole('option', {name: 'UTM Medium', exact: true})).toBeVisible();
            await expect(page.getByRole('option', {name: 'UTM Campaign', exact: true})).toBeVisible();
            await expect(page.getByRole('option', {name: 'Source', exact: true})).toBeVisible();
        });

        test('selecting filter field shows value options with visit counts', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await analyticsWebTrafficPage.openFilterPopover();
            await page.getByRole('option', {name: 'Source', exact: true}).click();

            const directOption = page.getByRole('option', {name: 'Direct'});
            await expect(directOption).toBeVisible({timeout: 15000});
            await expect(directOption).toContainText(/\d+/);
        });

        test('click on source row adds source filter', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('Direct', {timeout: 15000});

            await analyticsWebTrafficPage.clickSourceToFilter('direct');

            await expect(analyticsWebTrafficPage.getActiveFilter('Source')).toBeVisible();
        });

        test('filter persists in url', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('Direct', {timeout: 15000});

            await analyticsWebTrafficPage.clickSourceToFilter('direct');

            const url = page.url();
            expect(url).toContain('source=');
        });

        test('can remove filter', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('Direct', {timeout: 15000});

            await analyticsWebTrafficPage.clickSourceToFilter('direct');
            await expect(analyticsWebTrafficPage.getActiveFilter('Source')).toBeVisible();

            await analyticsWebTrafficPage.removeFilter('Source');

            await expect(analyticsWebTrafficPage.getActiveFilter('Source')).toBeHidden();
        });

        test('filtering shows only matching data', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('Direct', {timeout: 15000});

            await analyticsWebTrafficPage.clickSourceToFilter('direct');

            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('Direct');
            await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).not.toContainText('0');
        });

        test('removing filter restores original data', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto();
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('Direct', {timeout: 15000});

            await analyticsWebTrafficPage.clickSourceToFilter('direct');
            await expect(analyticsWebTrafficPage.getActiveFilter('Source')).toBeVisible();

            await analyticsWebTrafficPage.removeFilter('Source');

            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('Direct');
        });
    });
});
