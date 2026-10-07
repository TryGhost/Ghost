import { SidebarPage, SitePage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - View site', () => {
  test('shows the site homepage inside Admin', async ({ page }) => {
    const sidebar = new SidebarPage(page);
    await sidebar.goto('/ghost/#/analytics');

    await sidebar.getNavLink('View site').click();

    const sitePage = new SitePage(page);
    await sitePage.waitForPageToFullyLoad();
    await expect(sitePage.sitePreview.contentFrame().locator('body.home-template')).toBeVisible();
  });
});
