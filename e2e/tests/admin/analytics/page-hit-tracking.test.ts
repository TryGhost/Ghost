import {test, expect} from '../../../helpers/playwright';
import {AnalyticsOverviewPage} from '../../../helpers/pages/admin';
import {HomePage} from '../../../helpers/pages/public';

test.describe('Ghost Admin - Page Hit Tracking', () => {
    test('records visitor when homepage is visited', async ({page, browser, baseURL}) => {
        // Create a new browser context for visiting the public site
        const publicContext = await browser.newContext({
            baseURL: baseURL
        });
        const publicPage = await publicContext.newPage();

        // Set the synthetic monitoring flag to bypass test environment detection
        await publicPage.addInitScript(() => {
            window.__GHOST_SYNTHETIC_MONITORING__ = true;
        });
        const homePage = new HomePage(publicPage);

        // Act
        // Visit the homepage
        await homePage.goto();
        await expect(homePage.title).toBeVisible();

        // Wait for the page to be fully loaded
        await publicPage.waitForLoadState('networkidle');

        // Close the public context to ensure the page hit is recorded
        await publicContext.close();

        // Navigate to the analytics overview page
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();

        // Assert
        // Check that the unique visitors graph shows one visitor
        const uniqueVisitorsGraph = page.getByTestId('Unique visitors');
        await expect(uniqueVisitorsGraph).toBeVisible();

        await page.reload();
        // Wait for the visitor count to update
        await expect(uniqueVisitorsGraph).toContainText('Unique visitors1', {timeout: 10000});
    });
});
