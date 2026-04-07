import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage, SidebarPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';

function escapeNqlString(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
}

async function addFilter(membersPage: MembersListPage, filterName: 'Name' | 'Email' | 'Label', value: string) {
    if (filterName === 'Label') {
        const url = new URL(membersPage.page.url());
        const params = new URLSearchParams(url.search);
        const labelFilter = `label:${escapeNqlString(value)}`;
        const existingFilter = params.get('filter');

        params.set('filter', existingFilter ? `${existingFilter}+${labelFilter}` : labelFilter);
        await membersPage.page.goto(`/ghost/#/members?${params.toString()}`);
        return;
    }

    await membersPage.filterButton.click();
    await membersPage.page.getByRole('option', {name: filterName, exact: true}).click();

    if (filterName === 'Name') {
        await membersPage.page.getByRole('textbox', {name: 'Enter name...'}).fill(value);
        return;
    }

    if (filterName === 'Email') {
        await membersPage.page.getByRole('textbox', {name: 'Enter email...'}).fill(value);
        return;
    }

    await membersPage.page.getByRole('option', {name: value, exact: true}).click();
}

async function saveCurrentView(membersPage: MembersListPage, name: string) {
    await membersPage.membersPage.getByRole('button', {name: 'Save view'}).click();
    const dialog = membersPage.page.getByRole('dialog');
    await dialog.waitFor({state: 'visible'});
    await dialog.getByRole('textbox', {name: 'View name'}).fill(name);
    await dialog.getByRole('button', {name: 'Save'}).click();
    await dialog.waitFor({state: 'hidden'});
}

test.describe('Ghost Admin - Members Saved Views', () => {
    test.use({labs: {membersForward: true}});

    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('exact filter match controls active saved view and falls back to Members', async ({page}) => {
        test.slow();

        await memberFactory.create({
            name: 'Active Nav Member',
            email: 'active-nav-member@example.com',
            labels: ['Active Nav Label']
        });

        const sidebar = new SidebarPage(page);
        const membersPage = new MembersListPage(page);
        await page.goto('/ghost/#/members');

        await addFilter(membersPage, 'Name', 'active-nav');
        await saveCurrentView(membersPage, 'View A');

        await expect(sidebar.getNavLink('View A')).toHaveAttribute('aria-current', 'page');

        await addFilter(membersPage, 'Email', 'example.com');
        await saveCurrentView(membersPage, 'View B');

        await expect(sidebar.getNavLink('View B')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('View A')).not.toHaveAttribute('aria-current', 'page');

        await addFilter(membersPage, 'Label', 'Active Nav Label');

        await expect(sidebar.getNavLink('View A')).not.toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('View B')).not.toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('Members')).toHaveAttribute('aria-current', 'page');
    });
});
