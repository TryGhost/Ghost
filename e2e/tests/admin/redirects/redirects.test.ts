import {AnalyticsOverviewPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

// "/" and "/dashboard" are pure redirects owned by the React shell
// (apps/admin/src/home-redirect.tsx and the /dashboard loader); no labs flag,
// so no dual Ember/React suites — see DEVIATIONS.md, slice 6.
test.describe('Ghost Admin - Root and dashboard redirects', () => {
    test('"/ghost/" redirects the owner to Analytics', async ({page}) => {
        await page.goto('/ghost/');

        await expect(page).toHaveURL(/\/ghost\/#\/analytics$/);
        await expect(new AnalyticsOverviewPage(page).header).toBeVisible();
    });

    test('"/ghost/#/dashboard" redirects to Analytics', async ({page}) => {
        await page.goto('/ghost/#/dashboard');

        await expect(page).toHaveURL(/\/ghost\/#\/analytics$/);
        await expect(new AnalyticsOverviewPage(page).header).toBeVisible();
    });
});
