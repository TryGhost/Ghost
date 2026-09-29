import { CustomViewModal, PostsPage, SidebarPage } from '@/admin-pages';
import { TagFactory, createTagFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright/fixture';

// Round trips through saved posts views. Per-field cases (validation, filter
// edits, default views) live in the Admin acceptance tests.
test.describe('Ghost Admin - Custom Views', () => {
  let tagFactory: TagFactory;
  let postsPage: PostsPage;
  let sidebar: SidebarPage;
  let modal: CustomViewModal;

  test.beforeEach(async ({ page }) => {
    tagFactory = createTagFactory(page.request);
    postsPage = new PostsPage(page);
    sidebar = new SidebarPage(page);
    modal = new CustomViewModal(page);
  });

  async function saveView({
    type,
    tag,
    name,
    color,
  }: {
    type: string;
    tag: string;
    name: string;
    color: string;
  }): Promise<void> {
    await postsPage.selectType(type);
    await postsPage.selectTag(tag);

    await postsPage.openSaveViewModal();
    await modal.waitForModal();
    await modal.enterName(name);
    await modal.selectColor(color);
    await modal.save();
  }

  test('saving a filtered view - lists it in the sidebar and survives a reload', async ({
    page,
  }) => {
    const tag = await tagFactory.create({ name: 'Newsroom' });

    await postsPage.goto();
    await saveView({
      type: 'Draft posts',
      tag: 'Newsroom',
      name: 'Newsroom Drafts',
      color: 'blue',
    });

    const viewLink = sidebar.getNavLink('Newsroom Drafts');
    await expect(viewLink).toBeVisible();
    await expect(viewLink).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getCustomViewColorIndicator('Newsroom Drafts')).toHaveAttribute(
      'data-color',
      'blue',
    );

    await page.reload();

    await expect(viewLink).toBeVisible();
    await expect(page).toHaveURL(/type=draft/);
    await expect(page).toHaveURL(new RegExp(`tag=${tag.slug}`));
    await expect(viewLink).toHaveAttribute('aria-current', 'page');
  });

  test('switching between saved views - applies their filters and moves the active state', async ({
    page,
  }) => {
    const techTag = await tagFactory.create({ name: 'Tech' });
    const businessTag = await tagFactory.create({ name: 'Business' });

    await postsPage.goto();
    await saveView({ type: 'Draft posts', tag: 'Tech', name: 'Tech Drafts', color: 'green' });
    await sidebar.getNavLink('Posts').click();
    await saveView({
      type: 'Published posts',
      tag: 'Business',
      name: 'Business Live',
      color: 'purple',
    });

    const techLink = sidebar.getNavLink('Tech Drafts');
    const businessLink = sidebar.getNavLink('Business Live');

    await techLink.click();

    await expect(page).toHaveURL(/type=draft/);
    await expect(page).toHaveURL(new RegExp(`tag=${techTag.slug}`));
    await expect(techLink).toHaveAttribute('aria-current', 'page');
    await expect(businessLink).not.toHaveAttribute('aria-current', 'page');

    await businessLink.click();

    await expect(page).toHaveURL(/type=published/);
    await expect(page).toHaveURL(new RegExp(`tag=${businessTag.slug}`));
    await expect(businessLink).toHaveAttribute('aria-current', 'page');
    await expect(techLink).not.toHaveAttribute('aria-current', 'page');

    await sidebar.getNavLink('Posts').click();

    await expect(page).toHaveURL(/\/ghost\/#\/posts\/?$/);
    await expect(sidebar.getNavLink('Posts')).toHaveAttribute('aria-current', 'page');
    await expect(techLink).not.toHaveAttribute('aria-current', 'page');
    await expect(businessLink).not.toHaveAttribute('aria-current', 'page');
  });

  test('editing then deleting the active view - updates the sidebar and returns to Posts', async ({
    page,
  }) => {
    await tagFactory.create({ name: 'Review' });

    await postsPage.goto();
    await saveView({ type: 'Draft posts', tag: 'Review', name: 'Review Queue', color: 'blue' });

    await postsPage.openEditViewModal();
    await modal.waitForModal();
    await modal.enterName('Editorial Review');
    await modal.selectColor('red');
    await modal.save();

    const renamedLink = sidebar.getNavLink('Editorial Review');
    await expect(renamedLink).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getCustomViewColorIndicator('Editorial Review')).toHaveAttribute(
      'data-color',
      'red',
    );
    await expect(sidebar.getNavLink('Review Queue')).toBeHidden();

    await postsPage.openEditViewModal();
    await modal.waitForModal();
    await modal.delete();

    await expect(renamedLink).toBeHidden();
    await expect(page).toHaveURL(/\/ghost\/#\/posts\/?$/);
    await expect(sidebar.getNavLink('Posts')).toHaveAttribute('aria-current', 'page');
  });
});
