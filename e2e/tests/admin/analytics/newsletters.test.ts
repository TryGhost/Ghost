import {AnalyticsNewslettersPage} from '../../../helpers/pages/admin';
import {MembersImportService} from '../../../helpers/services/members-import';
import {expect, test} from '../../../helpers/playwright';

function subtractDaysFromCurrentDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
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
                created_at: subtractDaysFromCurrentDate(60).toISOString()
            },
            {
                email: 'ten-days-ago@example.com',
                name: 'Ten Days Ago',
                created_at: subtractDaysFromCurrentDate(10).toISOString()
            },
            {
                email: 'yesterday@example.com',
                name: 'Yesterday',
                created_at: subtractDaysFromCurrentDate(1).toISOString()
            }
        ];
        await membersService.import(members);

        await page.reload();
        await expect(newslettersPage.newslettersCard).toBeVisible();
        await expect(newslettersPage.totalSubscribers.value).toContainText('3');
        await expect(newslettersPage.totalSubscribers.diff).toContainText('+200%');
    });
});
