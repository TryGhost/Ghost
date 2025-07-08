import {test, expect} from '@playwright/test';
import {AnalyticsPage} from '../../helpers';

test.describe('Analytics Overview', () => {
    test('loads correctly', async ({page}) => {
        const analyticsPage = new AnalyticsPage(page);

        await analyticsPage.visit();
        await expect(page).toHaveURL('/ghost');
    });
});