import {AnalyticsGrowthPage} from '../../../helpers/pages/admin';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Growth', () => {
    let growthPage: AnalyticsGrowthPage;

    test.beforeEach(async ({page}) => {
        growthPage = new AnalyticsGrowthPage(page);
        await growthPage.goto();
    });

    test('empty top content card - posts and pages', async () => {
        await expect(growthPage.topContent.contentCard).toContainText('Which posts or pages drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - posts', async () => {
        await growthPage.topContent.postsButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('Which posts drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - pages', async () => {
        await growthPage.topContent.pagesButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('Which pages drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - sources', async () => {
        await growthPage.topContent.sourcesButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('How readers found your site in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });
});
