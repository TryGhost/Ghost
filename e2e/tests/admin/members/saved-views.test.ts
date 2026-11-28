import { CustomViewModal, LoginPage, MembersListPage, PostsPage, SidebarPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';
import {
  MemberFactory,
  createMemberFactory,
  createPostFactory,
  createTagFactory,
} from '@/data-factory';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

// Saved views are site-wide, and several tests assert the sidebar's whole list of
// them, so each test needs a site with no views saved by another test.
usePerTestIsolation();

/**
 * Opens the unfiltered members list from the sidebar's Members link. The add-filter
 * button is named "Filter" only while the list has no filters, so waiting for that
 * name keeps the next filter from going to the filter bar of the list being left.
 */
async function showAllMembers(sidebar: SidebarPage, membersPage: MembersListPage) {
  await sidebar.getNavLink('Members').click();
  await expect(membersPage.filterButton).toHaveAccessibleName('Filter');
}

/**
 * Waits until a list shows exactly these rows, in any order. A list keeps its previous
 * rows on screen while a new filter loads, so checking for one row, or for a missing
 * row, can pass before the filtered rows render. Order is left out because rows
 * created in the same second can be listed in either order.
 */
async function expectListed(rows: Locator, expected: string[]) {
  await expect.poll(async () => (await rows.allInnerTexts()).sort()).toEqual([...expected].sort());
}

test.describe('Ghost Admin - Members Saved Views', () => {
  let memberFactory: MemberFactory;

  test.beforeEach(async ({ page }) => {
    memberFactory = createMemberFactory(page.request);
  });

  test('exact filter match controls active saved view and falls back to Members', async ({
    page,
  }) => {
    test.slow();

    await memberFactory.create({
      name: 'Active Nav Member',
      email: 'active-nav-member@example.com',
      labels: ['Active Nav Label'],
    });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);
    await page.goto('/ghost/#/members');

    await membersPage.addFilter('Name', 'active-nav');
    await membersPage.saveCurrentView('View A');

    await expect(sidebar.getNavLink('View A')).toHaveAttribute('aria-current', 'page');

    await membersPage.addFilter('Email', 'example.com');
    await membersPage.saveCurrentView('View B');

    await expect(sidebar.getNavLink('View B')).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getNavLink('View A')).not.toHaveAttribute('aria-current', 'page');

    await membersPage.applyLabelFilter('Active Nav Label');

    await expect(sidebar.getNavLink('View A')).not.toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getNavLink('View B')).not.toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getNavLink('Members')).toHaveAttribute('aria-current', 'page');
  });

  test('saving a filtered view - lists it in the sidebar as the active view and keeps it after a reload', async ({
    page,
  }) => {
    await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
    await memberFactory.create({ name: 'Otto Outsider' });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);
    const viewLink = sidebar.getNavLink('VIP Readers');

    await membersPage.goto();
    await expectListed(membersPage.memberNames, ['Vera Reader', 'Otto Outsider']);
    await membersPage.applyLabelFilter('VIP');
    await membersPage.saveCurrentView('VIP Readers');

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers']);
    await expect(viewLink).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.getNavLink('Members')).not.toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader']);
    const savedFilter = membersPage.getUrlFilter();
    expect(savedFilter).toBeTruthy();

    await page.reload();

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers']);
    await expect(viewLink).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => membersPage.getUrlFilter()).toBe(savedFilter);
    await expectListed(membersPage.memberNames, ['Vera Reader']);
    await expect(membersPage.editViewButton).toBeVisible();
  });

  test('switching between saved views - applies each filter and moves the active state, and Members clears it', async ({
    page,
  }) => {
    await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
    await memberFactory.create({ name: 'Pete Press', labels: ['Press'] });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);
    const membersLink = sidebar.getNavLink('Members');
    const vipLink = sidebar.getNavLink('VIP Readers');
    const pressLink = sidebar.getNavLink('Press Contacts');

    await membersPage.goto();
    await membersPage.applyLabelFilter('VIP');
    await membersPage.saveCurrentView('VIP Readers');
    await expect(vipLink).toHaveAttribute('aria-current', 'page');
    const vipFilter = membersPage.getUrlFilter();

    await showAllMembers(sidebar, membersPage);
    await membersPage.applyLabelFilter('Press');
    await membersPage.saveCurrentView('Press Contacts');
    await expect(pressLink).toHaveAttribute('aria-current', 'page');
    const pressFilter = membersPage.getUrlFilter();

    expect(vipFilter).toBeTruthy();
    expect(pressFilter).toBeTruthy();
    expect(pressFilter).not.toBe(vipFilter);

    await vipLink.click();

    await expect(vipLink).toHaveAttribute('aria-current', 'page');
    await expect(pressLink).not.toHaveAttribute('aria-current', 'page');
    await expect(membersLink).not.toHaveAttribute('aria-current', 'page');
    await expect.poll(() => membersPage.getUrlFilter()).toBe(vipFilter);
    await expectListed(membersPage.memberNames, ['Vera Reader']);

    await pressLink.click();

    await expect(pressLink).toHaveAttribute('aria-current', 'page');
    await expect(vipLink).not.toHaveAttribute('aria-current', 'page');
    await expect(membersLink).not.toHaveAttribute('aria-current', 'page');
    await expect.poll(() => membersPage.getUrlFilter()).toBe(pressFilter);
    await expectListed(membersPage.memberNames, ['Pete Press']);

    await membersLink.click();

    await expect(membersLink).toHaveAttribute('aria-current', 'page');
    await expect(vipLink).not.toHaveAttribute('aria-current', 'page');
    await expect(pressLink).not.toHaveAttribute('aria-current', 'page');
    await expect.poll(() => membersPage.getHashRoute()).toEqual({ path: '/members', params: {} });
    await expectListed(membersPage.memberNames, ['Vera Reader', 'Pete Press']);
    await expect(membersPage.filterItems).toHaveCount(0);
  });

  test('renaming then deleting the open view - updates the sidebar and returns to Members, also after a reload', async ({
    page,
  }) => {
    test.slow();

    await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
    await memberFactory.create({ name: 'Pete Press', labels: ['Press'] });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);
    const membersLink = sidebar.getNavLink('Members');
    const renamedLink = sidebar.getNavLink('Inner Circle');

    await membersPage.goto();
    await membersPage.applyLabelFilter('VIP');
    await membersPage.saveCurrentView('VIP Readers');
    await showAllMembers(sidebar, membersPage);
    await membersPage.applyLabelFilter('Press');
    await membersPage.saveCurrentView('Press Contacts');
    await expectListed(membersPage.memberNames, ['Pete Press']);

    await sidebar.getNavLink('VIP Readers').click();
    await expect(sidebar.getNavLink('VIP Readers')).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader']);

    await membersPage.renameCurrentView('Inner Circle');

    await expect(sidebar.memberViewLinks).toHaveText(['Inner Circle', 'Press Contacts']);
    await expect(renamedLink).toHaveAttribute('aria-current', 'page');

    await page.reload();

    await expect(sidebar.memberViewLinks).toHaveText(['Inner Circle', 'Press Contacts']);
    await expect(renamedLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader']);

    await membersPage.deleteCurrentView();

    await expect(sidebar.memberViewLinks).toHaveText(['Press Contacts']);
    await expect.poll(() => membersPage.getHashRoute()).toEqual({ path: '/members', params: {} });
    await expect(membersLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader', 'Pete Press']);
    await expect(membersPage.filterItems).toHaveCount(0);

    await page.reload();

    await expect(sidebar.memberViewLinks).toHaveText(['Press Contacts']);
    await expect(membersLink).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => membersPage.getHashRoute()).toEqual({ path: '/members', params: {} });
    await expectListed(membersPage.memberNames, ['Vera Reader', 'Pete Press']);

    await sidebar.getNavLink('Press Contacts').click();

    await expect(sidebar.getNavLink('Press Contacts')).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Pete Press']);
  });

  test('saving a view with a name that already exists - shows an error, ignoring case and surrounding spaces, and leaves the existing view unchanged', async ({
    page,
  }) => {
    await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
    await memberFactory.create({ name: 'Pete Press', labels: ['Press'] });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);
    const vipLink = sidebar.getNavLink('VIP Readers');

    await membersPage.goto();
    await membersPage.applyLabelFilter('VIP');
    await membersPage.saveCurrentView('VIP Readers');
    await expect(vipLink).toHaveAttribute('aria-current', 'page');
    const vipFilter = membersPage.getUrlFilter();

    await showAllMembers(sidebar, membersPage);
    await membersPage.applyLabelFilter('Press');
    await membersPage.saveViewButton.click();
    await membersPage.viewPopover.waitForPopover();
    await membersPage.viewPopover.enterName(' vip readers ');
    await membersPage.viewPopover.saveButton.click();

    await expect(
      membersPage.viewPopover.dialog.getByText('A view with this name already exists', {
        exact: true,
      }),
    ).toBeVisible();

    await membersPage.viewPopover.close();

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers']);
    await expect(membersPage.saveViewButton).toBeVisible();

    await page.reload();

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers']);
    await expectListed(membersPage.memberNames, ['Pete Press']);
    await expect(membersPage.saveViewButton).toBeVisible();

    await vipLink.click();

    await expect(vipLink).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => membersPage.getUrlFilter()).toBe(vipFilter);
    await expectListed(membersPage.memberNames, ['Vera Reader']);
  });

  test("renaming a view to another view's name - shows that the name is taken and leaves both views unchanged, while changing the case of its own name succeeds", async ({
    page,
  }) => {
    await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
    await memberFactory.create({ name: 'Pete Press', labels: ['Press'] });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);
    const vipLink = sidebar.getNavLink('VIP Readers');
    const pressLink = sidebar.getNavLink('Press Contacts');

    await membersPage.goto();
    await membersPage.applyLabelFilter('VIP');
    await membersPage.saveCurrentView('VIP Readers');
    await showAllMembers(sidebar, membersPage);
    await membersPage.applyLabelFilter('Press');
    await membersPage.saveCurrentView('Press Contacts');
    await expect(pressLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Pete Press']);

    await membersPage.editViewButton.click();
    await membersPage.viewPopover.waitForPopover();
    await membersPage.viewPopover.enterName('vip readers');
    await membersPage.viewPopover.saveButton.click();

    // The popover shows the server's message, which calls a saved view a segment.
    await expect(
      membersPage.viewPopover.dialog.getByText('A segment with this name already exists', {
        exact: true,
      }),
    ).toBeVisible();

    await membersPage.viewPopover.close();

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers', 'Press Contacts']);
    await expect(pressLink).toHaveAttribute('aria-current', 'page');

    await membersPage.renameCurrentView('PRESS CONTACTS');

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers', 'PRESS CONTACTS']);
    await expect(pressLink).toHaveAttribute('aria-current', 'page');

    await page.reload();

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers', 'PRESS CONTACTS']);
    await expect(pressLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Pete Press']);

    await vipLink.click();

    await expect(vipLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader']);

    await pressLink.click();

    await expect(pressLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Pete Press']);
  });

  test('saving several views - lists them in the order they were saved, with a new view last and a renamed view in its place, also after a reload', async ({
    page,
  }) => {
    test.slow();

    await memberFactory.create({ name: 'Weekly Wendy' });
    await memberFactory.create({ name: 'Annual Anna' });
    await memberFactory.create({ name: 'Lapsed Larry' });
    await memberFactory.create({ name: 'Beta Bob' });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);

    async function saveNameView(name: string, viewName: string, memberName: string) {
      await showAllMembers(sidebar, membersPage);
      await membersPage.addFilter('Name', name);
      await membersPage.saveCurrentView(viewName);
      await expect(sidebar.getNavLink(viewName)).toHaveAttribute('aria-current', 'page');
      await expectListed(membersPage.memberNames, [memberName]);
    }

    await membersPage.goto();
    await saveNameView('weekly', 'Weekly digest', 'Weekly Wendy');
    await saveNameView('annual', 'Annual supporters', 'Annual Anna');
    await saveNameView('lapsed', 'Lapsed readers', 'Lapsed Larry');

    await expect(sidebar.memberViewLinks).toHaveText([
      'Weekly digest',
      'Annual supporters',
      'Lapsed readers',
    ]);

    await saveNameView('beta', 'Beta testers', 'Beta Bob');

    await expect(sidebar.memberViewLinks).toHaveText([
      'Weekly digest',
      'Annual supporters',
      'Lapsed readers',
      'Beta testers',
    ]);

    await sidebar.getNavLink('Annual supporters').click();
    await expect(sidebar.getNavLink('Annual supporters')).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Annual Anna']);
    await membersPage.renameCurrentView('Founding supporters');

    const expectedOrder = [
      'Weekly digest',
      'Founding supporters',
      'Lapsed readers',
      'Beta testers',
    ];
    await expect(sidebar.memberViewLinks).toHaveText(expectedOrder);

    await page.reload();

    await expect(sidebar.memberViewLinks).toHaveText(expectedOrder);
    await expect(sidebar.getNavLink('Founding supporters')).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Annual Anna']);

    for (const [viewName, memberName] of [
      ['Weekly digest', 'Weekly Wendy'],
      ['Founding supporters', 'Annual Anna'],
      ['Lapsed readers', 'Lapsed Larry'],
      ['Beta testers', 'Beta Bob'],
    ]) {
      await sidebar.getNavLink(viewName).click();

      await expect(sidebar.getNavLink(viewName)).toHaveAttribute('aria-current', 'page');
      await expectListed(membersPage.memberNames, [memberName]);
    }
  });

  test('changing the filter of the open view - offers saving a new view instead of editing it', async ({
    page,
  }) => {
    await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
    await memberFactory.create({ name: 'Val Viewer', labels: ['VIP'] });
    await memberFactory.create({ name: 'Vera Visitor' });

    const sidebar = new SidebarPage(page);
    const membersPage = new MembersListPage(page);
    const vipLink = sidebar.getNavLink('VIP Readers');
    const narrowedLink = sidebar.getNavLink('VIP named Vera');

    await membersPage.goto();
    await membersPage.applyLabelFilter('VIP');
    await membersPage.saveCurrentView('VIP Readers');
    await expect(vipLink).toHaveAttribute('aria-current', 'page');
    await expect(membersPage.editViewButton).toBeVisible();
    await expectListed(membersPage.memberNames, ['Vera Reader', 'Val Viewer']);
    const vipFilter = membersPage.getUrlFilter();

    await membersPage.addFilter('Name', 'Vera');

    await expect(membersPage.saveViewButton).toBeVisible();
    await expect(membersPage.editViewButton).toHaveCount(0);
    await expect(vipLink).not.toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader']);

    await membersPage.saveCurrentView('VIP named Vera');

    await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers', 'VIP named Vera']);
    await expect(narrowedLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader']);

    await vipLink.click();

    await expect(vipLink).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => membersPage.getUrlFilter()).toBe(vipFilter);
    await expectListed(membersPage.memberNames, ['Vera Reader', 'Val Viewer']);

    await narrowedLink.click();

    await expect(narrowedLink).toHaveAttribute('aria-current', 'page');
    await expectListed(membersPage.memberNames, ['Vera Reader']);
  });

  test('a view saved by the owner - is listed for a Super Editor and marked active when they open it', async ({
    page,
    browser,
    baseURL,
    ghostAccountSuperEditor,
  }) => {
    test.slow();

    await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
    await memberFactory.create({ name: 'Pete Press', labels: ['Press'] });

    const ownerMembersPage = new MembersListPage(page);
    await ownerMembersPage.goto();
    await ownerMembersPage.applyLabelFilter('VIP');
    await ownerMembersPage.saveCurrentView('VIP Readers');
    await expect(new SidebarPage(page).getNavLink('VIP Readers')).toHaveAttribute(
      'aria-current',
      'page',
    );

    await withIsolatedPage(browser, { baseURL }, async ({ page: superEditorPage }) => {
      const loginPage = new LoginPage(superEditorPage);
      const sidebar = new SidebarPage(superEditorPage);
      const membersPage = new MembersListPage(superEditorPage);
      const viewLink = sidebar.getNavLink('VIP Readers');

      await loginPage.goto();
      await loginPage.signIn(ghostAccountSuperEditor.email, ghostAccountSuperEditor.password);
      await sidebar.getNavLink('Members').click();
      await expectListed(membersPage.memberNames, ['Vera Reader', 'Pete Press']);

      await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers']);

      await viewLink.click();

      await expect(viewLink).toHaveAttribute('aria-current', 'page');
      await expectListed(membersPage.memberNames, ['Vera Reader']);
    });
  });

  test.describe('member views and posts views saved in one session', () => {
    /**
     * Creates the members and posts the two views tell apart: only Vera has the VIP
     * label, and only one post is a draft tagged Newsroom.
     */
    async function createViewData(page: Page): Promise<{ tagSlug: string }> {
      await memberFactory.create({ name: 'Vera Reader', labels: ['VIP'] });
      await memberFactory.create({ name: 'Otto Outsider' });

      const tag = await createTagFactory(page.request).create({ name: 'Newsroom' });
      const postFactory = createPostFactory(page.request);
      await postFactory.create({
        title: 'Newsroom draft',
        status: 'draft',
        tags: [{ id: tag.id }],
      });
      await postFactory.create({ title: 'Untagged draft', status: 'draft' });
      await postFactory.create({
        title: 'Newsroom story',
        status: 'published',
        tags: [{ id: tag.id }],
      });

      return { tagSlug: tag.slug };
    }

    async function saveMemberView(sidebar: SidebarPage, membersPage: MembersListPage) {
      await membersPage.applyLabelFilter('VIP');
      await membersPage.saveCurrentView('VIP Readers');
      await expect(sidebar.getNavLink('VIP Readers')).toHaveAttribute('aria-current', 'page');
      await expectListed(membersPage.memberNames, ['Vera Reader']);
    }

    async function savePostView(sidebar: SidebarPage, postsPage: PostsPage, page: Page) {
      const postViewModal = new CustomViewModal(page);

      await postsPage.selectType('Draft posts');
      await postsPage.selectTag('Newsroom');
      await postsPage.openSaveViewModal();
      await postViewModal.waitForModal();
      await postViewModal.enterName('Newsroom Drafts');
      await postViewModal.save();
      await expect(sidebar.getNavLink('Newsroom Drafts')).toHaveAttribute('aria-current', 'page');
      await expectListed(postsPage.postTitles, ['Newsroom draft']);
    }

    /**
     * Opens each saved view from the sidebar, on the screen it belongs to, and checks that
     * it still applies its filters: the member view lists only the VIP member, and the
     * posts view lists only the Newsroom draft.
     */
    async function expectBothViewsApplyTheirFilters(page: Page, tagSlug: string) {
      const sidebar = new SidebarPage(page);
      const membersPage = new MembersListPage(page);
      const postsPage = new PostsPage(page);
      const memberViewLink = sidebar.getNavLink('VIP Readers');
      const postViewLink = sidebar.getNavLink('Newsroom Drafts');

      await sidebar.getNavLink('Members').click();
      await expectListed(membersPage.memberNames, ['Vera Reader', 'Otto Outsider']);
      await expect(sidebar.memberViewLinks).toHaveText(['VIP Readers']);

      await memberViewLink.click();

      await expect(memberViewLink).toHaveAttribute('aria-current', 'page');
      await expectListed(membersPage.memberNames, ['Vera Reader']);

      // The unfiltered list also includes the site's default posts, so check for a
      // post the view leaves out.
      await sidebar.getNavLink('Posts').click();
      await expect(postsPage.getPostByTitle('Untagged draft')).toBeVisible();

      await postViewLink.click();

      await expect(postViewLink).toHaveAttribute('aria-current', 'page');
      await expect
        .poll(() => postsPage.getHashRoute())
        .toEqual({ path: '/posts', params: { type: 'draft', tag: tagSlug } });
      await expectListed(postsPage.postTitles, ['Newsroom draft']);
    }

    test('saving a member view then a posts view - keeps both after a reload', async ({ page }) => {
      const { tagSlug } = await createViewData(page);

      const sidebar = new SidebarPage(page);
      const membersPage = new MembersListPage(page);
      const postsPage = new PostsPage(page);

      await membersPage.goto();
      await saveMemberView(sidebar, membersPage);

      await sidebar.getNavLink('Posts').click();
      await savePostView(sidebar, postsPage, page);

      await page.reload();

      await expect(sidebar.getNavLink('Newsroom Drafts')).toHaveAttribute('aria-current', 'page');
      await expectListed(postsPage.postTitles, ['Newsroom draft']);
      await expectBothViewsApplyTheirFilters(page, tagSlug);
    });

    test('saving a posts view then a member view - keeps both after a reload', async ({ page }) => {
      const { tagSlug } = await createViewData(page);

      const sidebar = new SidebarPage(page);
      const membersPage = new MembersListPage(page);
      const postsPage = new PostsPage(page);

      await postsPage.goto();
      await savePostView(sidebar, postsPage, page);

      await sidebar.getNavLink('Members').click();
      await expectListed(membersPage.memberNames, ['Vera Reader', 'Otto Outsider']);
      await saveMemberView(sidebar, membersPage);

      await page.reload();

      await expect(sidebar.getNavLink('VIP Readers')).toHaveAttribute('aria-current', 'page');
      await expectListed(membersPage.memberNames, ['Vera Reader']);
      await expectBothViewsApplyTheirFilters(page, tagSlug);
    });
  });
});
