import {AnalyticsLocationsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {shouldSkipAnalyticsTests} from '@/helpers/environment/service-availability';

test.skip(await shouldSkipAnalyticsTests(), 'Tinybird not available');

test.describe('Ghost Admin - Locations', () => {
    test('empty sources card', async ({page}) => {
        const locationsPage = new AnalyticsLocationsPage(page);
        await locationsPage.goto();

        await expect(locationsPage.visitorsCard).toContainText('No visitors');
    });
});
