import { SidebarPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

// Exercised through `automations`, which is off by default and gates the
// sidebar's Automations link.
test.describe('Ghost Admin - Labs session override', () => {
  test('keeps a URL override for the session and drops it after clearing and reloading', async ({
    page,
  }) => {
    const sidebar = new SidebarPage(page);
    const automationsLink = sidebar.getNavLink('Automations');

    await page.goto('/ghost/#/posts?labs=automations');
    await expect(automationsLink).toBeVisible();

    // A fresh document without the query parameter retains the session choice.
    await page.goto('/ghost/#/posts');
    await page.reload();
    await expect(automationsLink).toBeVisible();

    await page.goto('/ghost/#/posts?labs=');
    await page.reload();
    // The sidebar renders its links together, so an override would show by now.
    await expect(sidebar.getNavLink('Tags')).toBeVisible();
    await expect(automationsLink).toBeHidden();
  });
});
