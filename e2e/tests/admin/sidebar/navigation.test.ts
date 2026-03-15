import {NAV_ITEMS, SidebarPage} from '@/admin-pages';
import {Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright/fixture';

// TODO: Remove this when the ActivityPub backend has been integrated with the E2E tests
async function mockNotificationCount(page: Page, count: number) {
    await page.route('**/.ghost/activitypub/*/notifications/unread/count', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/activity+json',
            body: JSON.stringify({count})
        });
    });
}

test.describe('Ghost Admin - Sidebar Navigation', () => {
    test.describe('main navigation', () => {
        NAV_ITEMS.forEach(({name, path}) => {
            test(`clicking ${name} - navigates and shows active state`, async ({page}) => {
                const sidebar = new SidebarPage(page);

                await sidebar.goto('/ghost');

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

    test.describe('network notification badge', () => {
        test('shows badge when there are unread notifications', async ({page}) => {
            const sidebar = new SidebarPage(page);
            await mockNotificationCount(page, 5);

            await sidebar.goto('/ghost');

            await expect(sidebar.getNavLink('Network')).toBeVisible();
            await expect(sidebar.networkNotificationBadge).toBeVisible();
            await expect(sidebar.networkNotificationBadge).toHaveText('5');
        });

        test('does not show badge when count is zero', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await mockNotificationCount(page, 0);

            await sidebar.goto('/ghost');

            await expect(sidebar.getNavLink('Network')).toBeVisible();
            await expect(sidebar.networkNotificationBadge).toBeHidden();
        });

        test('hides badge when navigating to network route and shows it again when navigating away', async ({page}) => {
            const sidebar = new SidebarPage(page);

            await mockNotificationCount(page, 5);

            await sidebar.goto('/ghost');
            
            // Badge should be visible initially
            await expect(sidebar.networkNotificationBadge).toBeVisible();
            await expect(sidebar.networkNotificationBadge).toHaveText('5');

            // Navigate to network route
            await sidebar.getNavLink('Network').click();

            // Badge should be hidden when on network route
            await expect(page).toHaveURL(/\/ghost\/#\/(network|activitypub)/);
            await expect(sidebar.networkNotificationBadge).toBeHidden();

            // Navigate away to posts
            await sidebar.getNavLink('Posts').click();
            await expect(page).toHaveURL(/\/ghost\/#\/posts/);

            // Badge should be visible again
            await expect(sidebar.networkNotificationBadge).toBeVisible();
            await expect(sidebar.networkNotificationBadge).toHaveText('5');
        });
    });
});
