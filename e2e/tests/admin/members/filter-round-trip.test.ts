import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';

// A filter is written into the URL as NQL and read back out of it on every navigation, so
// what a publisher typed only survives if those two agree. `$` is where they disagreed: it
// both ends a value and marks the end of a pattern, and the value was escaped to say which
// was meant. Reading it back ignored the escaping, so a filter for names containing "5$"
// returned as a filter for names ending in "5", with the value itself mangled.
//
// Reloading is the whole test. It is the point where the filter stops being state the page
// is holding and becomes text that has to be parsed again — and a saved view goes through
// exactly the same path, which is how the misreading became permanent rather than cosmetic.
//
// The assertions are about the filter, not about which members come back. Whether the server
// answers the right question is a separate concern in the query layer, covered at the API
// level; what is checked here is that admin still asks the question the publisher typed.
test.describe('Ghost Admin - Members Filter Round Trip', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('keeps a value ending in a dollar sign across a reload', async ({page}) => {
        test.slow();

        await memberFactory.create({name: 'Ticket 5$', email: 'ticket-dollar@example.com'});

        const membersPage = new MembersListPage(page);
        await page.goto('/ghost/#/members');

        await membersPage.addFilter('Name', '5$');

        const filterItem = membersPage.getFilterItem('Name');
        await expect(filterItem.getByRole('textbox')).toHaveValue('5$');
        await expect(filterItem).toContainText('contains');

        await page.reload();

        // Both halves were corrupted together, so both are asserted. The trailing `$` was
        // taken for an end-of-pattern marker, which turned "contains" into "ends with" and
        // left the value itself a character short.
        const reloaded = membersPage.getFilterItem('Name');
        await expect(reloaded.getByRole('textbox')).toHaveValue('5$');
        await expect(reloaded).toContainText('contains');
    });
});
