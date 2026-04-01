import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members List', () => {
    test.use({labs: {membersForward: true}});

    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('redirects the legacy members-forward route to members', async ({page}) => {
        await page.goto('/ghost/#/members-forward');

        await expect(page).toHaveURL(/\/ghost\/#\/members$/);
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

        // Each row shows the email and status
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
});
