import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage, SidebarPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';

async function addFilter(membersPage: MembersListPage, filterName: 'Name' | 'Email' | 'Label', value: string) {
    if (filterName === 'Label') {
        await membersPage.applyLabelFilter(value);
        return;
    }

    await membersPage.addFilter(filterName, value);
}

async function saveCurrentView(membersPage: MembersListPage, name: string) {
    await membersPage.saveCurrentView(name);
}

test.describe('Ghost Admin - Members Saved Views', () => {
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
