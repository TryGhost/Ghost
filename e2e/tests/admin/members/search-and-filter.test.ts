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

    test('filters members by searching for a name and clears search to restore all', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Unique Searchable Name', email: 'unique@example.com'},
            {name: 'Other Member', email: 'other@example.com'},
            {name: 'Another Member', email: 'another@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(3);

        await membersPage.searchInput.fill('Unique Searchable');
        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('Unique Searchable Name')).toBeVisible();

        await membersPage.searchInput.clear();
        await expect(membersPage.memberRows).toHaveCount(3);
    });

    test('filters members by label and updates the displayed count', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Labelled One', email: 'labelled1@example.com', labels: ['VIP']},
            {name: 'Labelled Two', email: 'labelled2@example.com', labels: ['VIP']},
            {name: 'No Label', email: 'nolabel@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(3);

        await page.goto('/ghost/#/members?filter=label:VIP');
        await expect(membersPage.memberRows).toHaveCount(2);
        await expect(membersPage.getMemberByName('Labelled One')).toBeVisible();
        await expect(membersPage.getMemberByName('Labelled Two')).toBeVisible();
    });

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

    test('adds a second label filter without replacing the first', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Both Labels', email: 'both@example.com', labels: ['VIP', 'Premium']},
            {name: 'VIP Only', email: 'vip@example.com', labels: ['VIP']},
            {name: 'Premium Only', email: 'premium@example.com', labels: ['Premium']},
            {name: 'No Label', email: 'nolabel@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(4);

        await page.goto('/ghost/#/members?filter=label:VIP');
        await expect(membersPage.memberRows).toHaveCount(2);

        await page.goto('/ghost/#/members?filter=label:VIP%2Blabel:Premium');
        await expect(membersPage.memberRows).toHaveCount(1);
        await expect(membersPage.getMemberByName('Both Labels')).toBeVisible();
    });

    test('shows no results state when search matches nothing', async ({page}) => {
        await memberFactory.create({name: 'Existing Member', email: 'exists@example.com'});

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(1);

        await membersPage.searchInput.fill('nonexistentnamestring');
        await expect(membersPage.noResults).toBeVisible();
        await expect(membersPage.showAllButton).toBeVisible();

        await membersPage.searchInput.clear();
        await expect(membersPage.memberRows).toHaveCount(1);
    });
});
