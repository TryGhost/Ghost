import { PostsPage, SidebarPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright/fixture';

// The class and Shade's dark tokens are covered in apps/admin acceptance; this
// journey covers Ember's dark stylesheet, which only the built page links.
test.describe('Ghost Admin - Appearance', () => {
  test('switching appearance restyles an Ember screen', async ({ page }) => {
    const postsPage = new PostsPage(page);
    const sidebar = new SidebarPage(page);
    const titleColor = () => postsPage.pageTitle.evaluate((title) => getComputedStyle(title).color);

    await postsPage.goto();
    await expect(postsPage.pageTitle).toBeVisible();
    const lightTitleColor = await titleColor();

    await sidebar.selectAppearance('dark');
    await sidebar.waitForDarkMode(true);
    await expect.poll(titleColor).not.toBe(lightTitleColor);

    await sidebar.selectAppearance('light');
    await sidebar.waitForDarkMode(false);
    await expect.poll(titleColor).toBe(lightTitleColor);
  });
});
