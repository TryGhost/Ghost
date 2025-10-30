import {AnalyticsNewslettersPage} from '../../../helpers/pages/admin';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Newsletters', () => {
    let newslettersPage: AnalyticsNewslettersPage;

    test.beforeEach(async ({page}) => {
        newslettersPage = new AnalyticsNewslettersPage(page);
        await newslettersPage.goto();
    });

    test('empty newsletters card', async () => {
        await expect(newslettersPage.newslettersCard).toBeVisible();
    });

    test('empty average open rate and click rate card', async () => {
        await newslettersPage.averageOpenRateTab.click();
        await expect(newslettersPage.newslettersCard).toContainText('No newsletters in the last 30 days');

        await newslettersPage.averageClickRateTab.click();
        await expect(newslettersPage.newslettersCard).toContainText('No newsletters in the last 30 days');
    });

    test('empty top newsletters card', async () => {
        await expect(newslettersPage.topNewslettersCard).toContainText('newsletters in the last 30 days');
    });
});
