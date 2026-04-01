import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members Export', () => {
    test.use({labs: {membersForward: true}});

    let memberFactory: MemberFactory;

    const membersFixture = [
        {name: 'Export Member 1', email: 'export1@example.com', note: 'First export test', labels: ['alpha']},
        {name: 'Export Member 2', email: 'export2@example.com', note: 'Second export test', labels: ['alpha']},
        {name: 'Export Member 3', email: 'export3@example.com', note: 'Third export test', labels: ['beta']}
    ];

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('exports the filtered members from the React list route', async ({page}) => {
        await memberFactory.createMany(membersFixture);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await membersPage.addFilter('Label', 'alpha');
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.openActionsMenu();
        await expect(membersPage.getMenuItem(/Export 2 members/)).toBeVisible();

        const {content} = await membersPage.exportMembers();

        expect(content).toContain('export1@example.com');
        expect(content).toContain('export2@example.com');
        expect(content).not.toContain('export3@example.com');
    });
});
