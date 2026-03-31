import {MemberFactory, createMemberFactory} from '@/data-factory';
import {SidebarPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';
import type {Page} from '@playwright/test';

function escapeNqlString(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
}

async function addFilter(page: Page, filterName: 'Name' | 'Email' | 'Label', value: string) {
    if (filterName === 'Label') {
        const url = new URL(page.url());
        const params = new URLSearchParams(url.search);
        const labelFilter = `label:${escapeNqlString(value)}`;
        const existingFilter = params.get('filter');

        params.set('filter', existingFilter ? `${existingFilter}+${labelFilter}` : labelFilter);
        await page.goto(`/ghost/#/members-forward?${params.toString()}`);
        return;
    }

    await page.getByRole('button', {name: /^(Filter|Add filter)$/}).click();
    await page.getByRole('option', {name: filterName, exact: true}).click();

    if (filterName === 'Name') {
        await page.getByRole('textbox', {name: 'Enter name...'}).fill(value);
        return;
    }

    if (filterName === 'Email') {
        await page.getByRole('textbox', {name: 'Enter email...'}).fill(value);
        return;
    }

    await page.getByRole('option', {name: value, exact: true}).click();
}

async function saveCurrentView(page: Page, name: string) {
    await page.getByRole('button', {name: 'Save view'}).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({state: 'visible'});
    await dialog.getByRole('textbox', {name: 'View name'}).fill(name);
    await dialog.getByRole('button', {name: 'Save'}).click();
    await dialog.waitFor({state: 'hidden'});
}

test.describe('Ghost Admin - Members Forward Saved Views', () => {
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
        await page.goto('/ghost/#/members-forward');

        await addFilter(page, 'Name', 'active-nav');
        await saveCurrentView(page, 'View A');

        await expect(sidebar.getNavLink('View A')).toHaveAttribute('aria-current', 'page');

        await addFilter(page, 'Email', 'example.com');
        await saveCurrentView(page, 'View B');

        await expect(sidebar.getNavLink('View B')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('View A')).not.toHaveAttribute('aria-current', 'page');

        await addFilter(page, 'Label', 'Active Nav Label');

        await expect(sidebar.getNavLink('View A')).not.toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('View B')).not.toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('Members')).toHaveAttribute('aria-current', 'page');
    });
});
