import {AnalyticsNewslettersPage} from '@/admin-pages';
import {MembersImportService} from '@/helpers/services/members-import';
import {expect, test} from '@/helpers/playwright';

function getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
}

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

    test('total subscribers percent change calculation', async ({page}) => {
        const membersService = new MembersImportService(page.request);

        const members = [
            {
                email: 'sixty-days-ago@example.com',
                name: 'Sixty Days Ago',
                created_at: getDateDaysAgo(60)
            },
            {
                email: 'ten-days-ago@example.com',
                name: 'Ten Days Ago',
                created_at: getDateDaysAgo(10)
            },
            {
                email: 'yesterday@example.com',
                name: 'Yesterday',
                created_at: getDateDaysAgo(1)
            }
        ];
        await membersService.import(members);

        await page.reload();
        await expect(newslettersPage.newslettersCard).toBeVisible();
        await expect(newslettersPage.totalSubscribers.value).toContainText('3');
        await expect(newslettersPage.totalSubscribers.diff).toContainText('+200%');
    });
});
