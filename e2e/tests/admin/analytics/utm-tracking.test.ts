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

        test('can add utm_source filter from filter menu', async ({page, browser, baseURL}) => {
            // Generate traffic with UTM parameters
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'newsletter',
                    utm_medium: 'email',
                    utm_campaign: 'launch'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            // Add UTM Source filter
            await analyticsWebTrafficPage.addFilter('UTM Source', 'newsletter');

            // Verify filter is active
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Source')).toBeVisible();
        });

        test('can add utm_medium filter from filter menu', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'google',
                    utm_medium: 'cpc',
                    utm_campaign: 'spring2024'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            await analyticsWebTrafficPage.addFilter('UTM Medium', 'cpc');

            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Medium')).toBeVisible();
        });

        test('can add utm_campaign filter from filter menu', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'twitter',
                    utm_medium: 'social',
                    utm_campaign: 'product_launch'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            await analyticsWebTrafficPage.addFilter('UTM Campaign', 'product_launch');

            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Campaign')).toBeVisible();
        });

        test('filter persists in url for bookmarking', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'test_source'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            // Add a filter
            await analyticsWebTrafficPage.addFilter('UTM Source', 'test_source');

            // Verify URL contains filter parameter
            const url = page.url();
            expect(url).toContain('utm_source=test_source');
        });

        test('can navigate to page with filter in url', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'bookmarked_source'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            // Navigate with filter already in URL
            await analyticsWebTrafficPage.gotoWithFilters({utm_source: 'bookmarked_source'});

            // Filter should be applied from URL
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Source')).toBeVisible();
        });

        test('can remove filter', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'removable_source'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            // Add a filter
            await analyticsWebTrafficPage.addFilter('UTM Source', 'removable_source');
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Source')).toBeVisible();

            // Remove the filter
            await analyticsWebTrafficPage.removeFilter('UTM Source');
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Source')).toBeHidden();
        });

        test('can remove multiple filters individually', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'clear_test',
                    utm_medium: 'clear_medium'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            // Add multiple filters
            await analyticsWebTrafficPage.addFilter('UTM Source', 'clear_test');
            await analyticsWebTrafficPage.addFilter('UTM Medium', 'clear_medium');

            // Verify both filters are visible
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Source')).toBeVisible();
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Medium')).toBeVisible();

            // Remove filters one by one
            await analyticsWebTrafficPage.removeFilter('UTM Source');
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Source')).toBeHidden();

            await analyticsWebTrafficPage.removeFilter('UTM Medium');
            await expect(analyticsWebTrafficPage.getActiveFilter('UTM Medium')).toBeHidden();
        });

        test('click on source row adds source filter', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'clickable_source'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            // Wait for sources card to load
            await analyticsWebTrafficPage.topSourcesCard.waitFor({state: 'visible'});

            // Wait for the specific source row to appear (the one we created with utm_source)
            const sourceRow = page.getByTestId('source-row-clickable_source');
            await sourceRow.waitFor({state: 'visible', timeout: 10000});

            // Click on the source row
            await sourceRow.click();

            // Verify source filter is added
            await expect(analyticsWebTrafficPage.getActiveFilter('Source')).toBeVisible();
        });
    });
});
