import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members Search and Filter', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    // Server-side filtering journey. The client-side halves (URL/NQL
    // serialization, filter UI, empty states) are covered by
    // apps/admin/src/members/members-filtering.acceptance.test.tsx.
    test('combines multiple filters to narrow results and clears all at once', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Alice Alpha', email: 'alice@alpha.com', labels: ['Premium']},
            {name: 'Alice Beta', email: 'alice@beta.com'},
            {name: 'Bob Alpha', email: 'bob@alpha.com', labels: ['Premium']},
            {name: 'Charlie Gamma', email: 'charlie@gamma.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(4);

        await membersPage.addFilter('Name', 'Alice');
        await expect(membersPage.memberRows).toHaveCount(2);

        await page.goto('/ghost/#/members?filter=name:~%27Alice%27%2Blabel:Premium');
        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('Alice Alpha')).toBeVisible();

        await membersPage.clearFiltersButton.click();
        await expect(membersPage.memberRows).toHaveCount(4);
    });
});
