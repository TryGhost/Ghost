import {SidebarPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import type {Page} from '@playwright/test';

test.use({isolation: 'per-test'});

async function getPreferences(page: Page) {
    const response = await page.request.get('/ghost/api/admin/users/me/?include=roles');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    const user = body.users[0];

    return user.accessibility ? JSON.parse(user.accessibility) : {};
}

test.describe('Ghost Admin - User Preferences', () => {
    test('a preference set in one tab survives a preference write in another', async ({page}) => {
        const firstTab = new SidebarPage(page);
        await firstTab.goto('/ghost/#/analytics');
        await expect(firstTab.postsToggle).toBeVisible();

        // Reading stored state here is synchronisation, not the assertion: let
        // Admin's own initialising write land before the choice below is made.
        await expect.poll(async () => Boolean((await getPreferences(page)).whatsNew?.lastSeenDate)).toBe(true);

        const secondPage = await page.context().newPage();
        const secondTab = new SidebarPage(secondPage);
        await secondTab.goto('/ghost/#/analytics');
        await expect(secondTab.postsToggle).toBeVisible();

        await secondTab.userDropdownTrigger.click();
        await secondTab.appearanceMenuItem.click();
        await secondTab.themeDarkOption.click();
        await secondTab.waitForDarkMode(true);
        await expect.poll(async () => (await getPreferences(secondPage)).nightShift).toBe('dark');

        // An unrelated preference write in the first tab, whose loaded state
        // predates the appearance change above.
        await page.bringToFront();
        await firstTab.collapsePostsSubmenu();
        await expect.poll(async () => (await getPreferences(page)).navigation?.expanded?.posts).toBe(false);

        // The choice is still in effect where it was made.
        await secondPage.reload({waitUntil: 'load'});
        await expect(secondTab.postsToggle).toBeVisible();
        await secondTab.waitForDarkMode(true);
    });

    test('an appearance choice is read back after a reload', async ({page}) => {
        const sidebar = new SidebarPage(page);
        await sidebar.goto('/ghost/#/analytics');
        await expect(sidebar.postsToggle).toBeVisible();

        await sidebar.userDropdownTrigger.click();
        await sidebar.appearanceMenuItem.click();
        await sidebar.themeDarkOption.click();
        await sidebar.waitForDarkMode(true);

        // Synchronisation, not the assertion: reload only once the choice is
        // stored, so this measures what Admin reads back rather than a write
        // still in flight.
        await expect.poll(async () => (await getPreferences(page)).nightShift).toBe('dark');
        await page.reload({waitUntil: 'load'});

        await expect(sidebar.postsToggle).toBeVisible();
        await sidebar.waitForDarkMode(true);
    });

    test('a collapsed sidebar group is read back after a reload', async ({page}) => {
        const sidebar = new SidebarPage(page);
        await sidebar.goto('/ghost/#/analytics');
        await expect(sidebar.postsToggle).toBeVisible();

        await sidebar.collapsePostsSubmenu();
        // Synchronisation, as above.
        await expect.poll(async () => (await getPreferences(page)).navigation?.expanded?.posts).toBe(false);

        await page.reload({waitUntil: 'load'});

        await expect(sidebar.postsToggle).toBeVisible();
        await expect(sidebar.postsToggle).toHaveAttribute('aria-expanded', 'false');
    });
});
