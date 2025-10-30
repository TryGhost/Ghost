import {AnalyticsLocationsPage} from '../../../helpers/pages/admin';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Locations', () => {
    test('empty sources card', async ({page}) => {
        const locationsPage = new AnalyticsLocationsPage(page);
        await locationsPage.goto();

        await expect(locationsPage.visitorsCard).toContainText('No visitors');
    });
});
