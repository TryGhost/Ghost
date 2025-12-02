import {SidebarPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';

type UserRole = 'Administrator' | 'Editor' | 'Author' | 'Contributor';

interface NavItem {
    name: string;
    path: RegExp;
    roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
    {name: 'Analytics', path: /\/ghost\/#\/analytics\/?$/, roles: ['Administrator']},
    {name: 'View site', path: /\/ghost\/#\/site\/?$/, roles: ['Administrator', 'Editor']},
    {name: 'Posts', path: /\/ghost\/#\/posts\/?$/, roles: ['Administrator', 'Editor', 'Author', 'Contributor']},
    {name: 'Pages', path: /\/ghost\/#\/pages\/?$/, roles: ['Administrator', 'Editor']},
    {name: 'Tags', path: /\/ghost\/#\/tags\/?$/, roles: ['Administrator', 'Editor']},
    {name: 'Members', path: /\/ghost\/#\/members\/?$/, roles: ['Administrator', 'Editor']}
];

test.describe('Ghost Admin - Sidebar Navigation', () => {
    test.describe('main navigation', () => {
        NAV_ITEMS.forEach(({name, path}) => {
            test(`clicking ${name} - navigates and shows active state`, async ({page}) => {
                const sidebar = new SidebarPage(page);

                await sidebar.goto('/ghost');

                expect(process.env.USE_REACT_SHELL).not.toBeDefined();

                await sidebar.getNavLink(name).click();

                await expect(page).toHaveURL(path);
                await expect(sidebar.getNavLink(name)).toHaveAttribute('aria-current', 'page');
            });
        });
    });

    test.describe('posts submenu', () => {
        test('default views are visible when posts submenu is expanded', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost/#/posts');
            await sidebar.expandPostsSubmenu();

            await expect(sidebar.getNavLink('Drafts')).toBeVisible();
            await expect(sidebar.getNavLink('Scheduled')).toBeVisible();
            await expect(sidebar.getNavLink('Published')).toBeVisible();
        });

        test('clicking submenu item - navigates and shows active state', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost/#/posts');
            await sidebar.expandPostsSubmenu();

            await sidebar.getNavLink('Scheduled').click();

            await expect(page).toHaveURL(/type=scheduled/);
            await expect(sidebar.getNavLink('Scheduled')).toHaveAttribute('aria-current', 'page');
        });

        test('clicking submenu item - parent is expanded but not active', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost/#/posts');
            await sidebar.expandPostsSubmenu();

            await sidebar.getNavLink('Scheduled').click();

            await expect(sidebar.postsToggle).toHaveAttribute('aria-expanded', 'true');
            await expect(sidebar.getNavLink('Posts')).not.toHaveAttribute('aria-current', 'page');
        });

        test('clicking parent Posts link - deactivates submenu item', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost/#/posts?type=scheduled');
            await sidebar.expandPostsSubmenu();

            await expect(sidebar.getNavLink('Scheduled')).toHaveAttribute('aria-current', 'page');

            await sidebar.getNavLink('Posts').click();

            await expect(page).toHaveURL(/\/ghost\/#\/posts\/?$/);
            await expect(sidebar.getNavLink('Scheduled')).not.toHaveAttribute('aria-current', 'page');
            await expect(sidebar.getNavLink('Posts')).toHaveAttribute('aria-current', 'page');
        });
    });

    test.describe('sidebar footer', () => {
        test('Settings link - is visible and navigates', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost/#/posts');

            await expect(sidebar.getNavLink('Settings')).toBeVisible();

            await sidebar.getNavLink('Settings').click();

            await expect(page).toHaveURL(/\/ghost\/#\/settings/);
        });

        test('user dropdown - opens and shows menu items', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost');

            await expect(sidebar.userDropdownTrigger).toBeVisible();

            await sidebar.userDropdownTrigger.click();

            await expect(sidebar.userProfileLink).toBeVisible();
            await expect(sidebar.signOutLink).toBeVisible();
        });

        test('user profile link - navigates to profile settings', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost');
            await sidebar.userDropdownTrigger.click();

            await sidebar.userProfileLink.click();

            await expect(page).toHaveURL(/\/ghost\/#\/settings\/staff\//);
        });

        test('night shift toggle - changes state on click', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost');
            await sidebar.userDropdownTrigger.click();

            const initialState = await sidebar.isNightShiftEnabled();

            await sidebar.nightShiftToggle.click();

            const expectedState = !initialState;
            await sidebar.waitForNightShiftEnabled(expectedState);

            const newState = await sidebar.isNightShiftEnabled();
            expect(newState).toBe(expectedState);
        });

        test('sign out link - is visible in dropdown', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await sidebar.goto('/ghost');
            await sidebar.userDropdownTrigger.click();

            await expect(sidebar.signOutLink).toBeVisible();
        });
    });
});
