import {MemberDetailsPage, MembersListPage} from '@/admin-pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members List', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('displays members with name, email, status, and created date', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Alice Anderson', email: 'alice@example.com'},
            {name: 'Bob Baker', email: 'bob@example.com'},
            {name: 'Charlie Clark', email: 'charlie@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await expect(membersPage.memberRows).toHaveCount(3);
        await expect(membersPage.getMemberByName('Alice Anderson')).toBeVisible();
        await expect(membersPage.getMemberByName('Bob Baker')).toBeVisible();
        await expect(membersPage.getMemberByName('Charlie Clark')).toBeVisible();
        await expect(membersPage.getMemberByName('Alice Anderson')).toContainText('alice@example.com');
        await expect(membersPage.getMemberByName('Alice Anderson')).toContainText('Free');
    });

    test('shows empty state when there are no members', async ({page}) => {
        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await expect(membersPage.emptyState).toBeVisible();
        await expect(membersPage.memberRows).toHaveCount(0);
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
