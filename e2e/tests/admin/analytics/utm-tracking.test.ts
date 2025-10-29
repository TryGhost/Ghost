import {AnalyticsWebTrafficPage} from '../../../helpers/pages/admin';
import {HomePage} from '../../../helpers/pages/public';
import {expect, test, withIsolatedPage} from '../../../helpers/playwright';

test.describe('Ghost Admin - Analytics UTM Tracking', () => {
    test.describe('utmTracking flag disabled', () => {
        test('utm components hidden', async ({page}) => {
            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();
            await expect(analyticsWebTrafficPage.campaignsDropdown).not.toBeVisible();
        });
    });

    test.describe('utmTracking flag enabled', () => {
        test.use({labs: {utmTracking: true}});

        test('displays utm_source data correctly', async ({page, browser, baseURL}) => {
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
            await analyticsWebTrafficPage.selectCampaignType('UTM sources');

            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('newsletter');
        });

        test('displays utm_medium data correctly', async ({page, browser, baseURL}) => {
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
            await analyticsWebTrafficPage.selectCampaignType('UTM mediums');

            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('cpc');
        });

        test('displays utm_campaign data correctly', async ({page, browser, baseURL}) => {
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
            await analyticsWebTrafficPage.selectCampaignType('UTM campaigns');

            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('product_launch');
        });

        test('displays multiple utm parameters from single page hit', async ({page, browser, baseURL}) => {
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.gotoWithQueryParams({
                    utm_source: 'test_source',
                    utm_term: 'test_term',
                    utm_content: 'test_content'
                });
            });

            const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
            await analyticsWebTrafficPage.goto();

            await analyticsWebTrafficPage.selectCampaignType('UTM sources');
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('test_source');
            await analyticsWebTrafficPage.selectCampaignType('UTM terms');
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('test_term');
            await analyticsWebTrafficPage.selectCampaignType('UTM contents');
            await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('test_content');
        });
    });
});
