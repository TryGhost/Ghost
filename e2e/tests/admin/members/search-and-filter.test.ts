import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members Search and Filter', () => {
    test.use({labs: {membersForward: true}});

    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('applies an existing label filter on the members route', async ({page}) => {
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
});
