import {test, expect} from '@playwright/test';
import {AnalyticsGrowthPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - Growth', () => {
    test('empty top content card - posts and pages', async ({page}) => {
        const growthPage = new AnalyticsGrowthPage(page);
        await growthPage.goto();

        await expect(growthPage.topContent.contentCard).toContainText('Which posts or pages drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - posts', async ({page}) => {
        const growthPage = new AnalyticsGrowthPage(page);
        await growthPage.goto();
        await growthPage.topContent.postsButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('Which posts drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - pages', async ({page}) => {
        const growthPage = new AnalyticsGrowthPage(page);
        await growthPage.goto();
        await growthPage.topContent.pagesButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('Which pages drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - sources', async ({page}) => {
        const growthPage = new AnalyticsGrowthPage(page);
        await growthPage.goto();
        await growthPage.topContent.sourcesButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('How readers found your site in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });
});
