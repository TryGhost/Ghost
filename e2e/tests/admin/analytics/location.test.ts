import {test, expect} from '../../../helpers/playwright';
import {AnalyticsLocationsPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - Locations', () => {
    test('empty sources card', async ({page}) => {
        const locationsPage = new AnalyticsLocationsPage(page);
        await locationsPage.goto();

        await expect(locationsPage.visitorsCard).toContainText('No visitors');
    });
});
