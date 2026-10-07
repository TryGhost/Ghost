import { NAV_ITEMS, SidebarPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright/fixture';

// Client-side sidebar cases (nav rendering, posts submenu and views, user menu,
// network badge, settings navigation) live in apps/admin/src/layout/sidebar.acceptance.test.tsx.
test.describe('Ghost Admin - Sidebar Navigation', () => {
  test('clicking each nav item navigates and shows active state', async ({ page }) => {
    const sidebar = new SidebarPage(page);

    for (const { name, path } of NAV_ITEMS) {
      await sidebar.goto('/ghost');
      await sidebar.getNavLink(name).click();

      await expect(page).toHaveURL(path);
      await expect(sidebar.getNavLink(name)).toHaveAttribute('aria-current', 'page');
    }
  });
});
