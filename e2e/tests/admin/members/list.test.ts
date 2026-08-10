import {MemberDetailsPage, MembersListPage} from '@/admin-pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersService} from '@/helpers/services/members';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Members List', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        await new MembersService(page.request).deleteAll();
        memberFactory = createMemberFactory(page.request);
    });

    test('add yourself from empty state - creates a member for the current user', async ({page, ghostAccountOwner}) => {
        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await expect(membersPage.emptyState).toBeVisible();
        await membersPage.addYourselfButton.click();

        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName(ghostAccountOwner.name)).toBeVisible();
        await expect(membersPage.getMemberByName(ghostAccountOwner.name)).toContainText(ghostAccountOwner.email);
    });

    test('navigates to member detail when clicking a row', async ({page}) => {
        const member = await memberFactory.create({
            name: 'Detail Test Member',
            email: 'detail@example.com'
        });

        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await membersPage.openMemberByName('Detail Test Member');

        await expect(page).toHaveURL(new RegExp(`/members/${member.id}`));
    });

    test('preserves filters when returning from member detail', async ({page}) => {
        const member = await memberFactory.create({
            name: 'VIP Detail Member',
            email: 'vip-detail@example.com',
            labels: ['VIP']
        });

        const membersPage = new MembersListPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        await page.goto('/ghost/#/members?filter=label:VIP');

        await membersPage.openMemberByName('VIP Detail Member');
        await expect(page).toHaveURL(new RegExp(`/members/${member.id}\\?back=`));

        await memberDetailsPage.membersBackLink.click();

        await expect(page).toHaveURL(/\/members\?filter=label%3A%5BVIP%5D$/);
        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('VIP Detail Member')).toBeVisible();
    });
});
