import {AnalyticsWebTrafficPage} from '../../../helpers/pages/admin';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Analytics Web Traffic', () => {
    let analyticsWebTrafficPage: AnalyticsWebTrafficPage;

    test.beforeEach(async ({page}) => {
        analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
        await analyticsWebTrafficPage.goto();
    });

    test('empty web traffic general graph', async () => {
        await expect(analyticsWebTrafficPage.totalUniqueVisitorsTab).toContainText('0');
        await expect(analyticsWebTrafficPage.totalViewsTab).toContainText('0');
    });

    test('empty top content card', async () => {
        await expect(analyticsWebTrafficPage.topContentCard).toContainText('No visitors');
    });

    test('empty top content card - posts', async () => {
        await analyticsWebTrafficPage.postsButton.click();

        await expect(analyticsWebTrafficPage.topContentCard).toContainText('No visitors');
    });

    test('empty top content card - pages', async () => {
        await analyticsWebTrafficPage.pagesButton.click();

        await expect(analyticsWebTrafficPage.topContentCard).toContainText('No visitors');
    });

    test('empty top sources card', async () => {
        await expect(analyticsWebTrafficPage.topSourcesCard).toContainText('No visitors');
    });
});
