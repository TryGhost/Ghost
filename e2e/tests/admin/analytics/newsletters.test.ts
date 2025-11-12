import {AnalyticsNewslettersPage} from '../../../helpers/pages/admin';
import {MembersImportService} from '../../../helpers/services/members';
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

    test('percent change calculation', async ({page}) => {
        // Create members import service
        const membersService = new MembersImportService(page.request);
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const members = [
            {
                email: 'backdated-member@example.com',
                name: 'Backdated Test Member',
                created_at: sixtyDaysAgo.toISOString()
            },
            {
                email: 'another-backdated-member@example.com',
                name: 'Another Backdated Test Member',
                created_at: tenDaysAgo.toISOString()
            },
            {
                email: 'yet-another-backdated-member@example.com',
                name: 'Yet Another Backdated Test Member',
                created_at: yesterday.toISOString()
            }
        ];
        await membersService.importMembers(members);

        await page.reload();
        await expect(newslettersPage.newslettersCard).toBeVisible();
        await expect(newslettersPage.totalSubscribers.value).toContainText('3');
        await expect(newslettersPage.totalSubscribers.diff).toContainText('+200%');
    });
});
