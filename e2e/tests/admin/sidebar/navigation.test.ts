import {NAV_ITEMS, SidebarPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';

// Client-side sidebar cases (nav rendering, posts toggle, user menu, network
// badge, settings navigation) live in apps/admin/src/layout/sidebar.acceptance.test.tsx;
// the cases here assert active states driven by the Ember routing bridge.
test.describe('Ghost Admin - Sidebar Navigation', () => {
    test.describe('main navigation', () => {
        test('clicking each nav item navigates and shows active state', async ({page}) => {
            const sidebar = new SidebarPage(page);

            for (const {name, path} of NAV_ITEMS) {
                await sidebar.goto('/ghost');
                await sidebar.getNavLink(name).click();

                await expect(page).toHaveURL(path);
                await expect(sidebar.getNavLink(name)).toHaveAttribute('aria-current', 'page');
            }
        });
    });

    test.describe('posts submenu', () => {
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
});
