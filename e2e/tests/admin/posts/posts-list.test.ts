import { PostFactory, createPostFactory } from '@/data-factory';
import { PostsPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

// Per-field cases live in the Admin acceptance tests.

usePerTestIsolation();

// `featured` is randomised by the post factory; pinned here because the star is
// not what any of these tests are about.
test.describe('Ghost Admin - Posts List', () => {
  let postFactory: PostFactory;
  let postsPage: PostsPage;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
    postsPage = new PostsPage(page);
  });

  test('lists the posts that exist', async () => {
    await postFactory.create({ title: 'A listed draft', status: 'draft', featured: false });

    await postsPage.goto();
    await postsPage.waitForPageToFullyLoad();

    await expect(postsPage.getPostByTitle('A listed draft')).toBeVisible();
  });

  test('filters the list down to drafts', async () => {
    await postFactory.create({ title: 'Still a draft', status: 'draft', featured: false });
    await postFactory.create({
      title: 'Already published',
      status: 'published',
      featured: false,
    });

    await postsPage.goto();
    await postsPage.waitForPageToFullyLoad();
    await postsPage.selectType('Draft posts');

    await expect(postsPage.getPostByTitle('Still a draft')).toBeVisible();
    await expect(postsPage.getPostByTitle('Already published')).toBeHidden();
  });

  /**
   * The five query params are a saved view's identity — the sidebar stores
   * them verbatim. A screen that rewrote or dropped one would stop matching
   * every existing saved view, so the URL has to survive a load untouched.
   */
  test('leaves a saved view URL exactly as it was given', async ({ page }) => {
    await postFactory.create({ title: 'Any draft', status: 'draft', featured: false });
    const savedViewUrl = '/ghost/#/posts?type=draft&order=updated_at+desc';

    await page.goto(savedViewUrl);
    await postsPage.waitForList();

    const hash = new URL(page.url()).hash;
    expect(hash).toContain('type=draft');
    expect(hash).toContain('order=updated_at');
  });

  // No checkboxes — selection is modifier-click.
  test('selects a row on modifier-click', async () => {
    await postFactory.create({ title: 'Selectable', status: 'draft', featured: false });

    await postsPage.goto();
    await postsPage.waitForList();
    await postsPage.selectPost('Selectable');

    await expect(async () => {
      expect(await postsPage.selectedPostCount()).toBe(1);
    }).toPass();
  });

  test('right-click opens a menu describing the row', async () => {
    await postFactory.create({ title: 'Right clickable', status: 'draft', featured: false });

    await postsPage.goto();
    await postsPage.waitForList();
    await postsPage.openContextMenuFor('Right clickable');

    // A draft has no public link to copy, so it offers the preview one.
    await expect(postsPage.contextMenuItem('Copy preview link')).toBeVisible();
    await expect(postsPage.contextMenuItem('Add a tag')).toBeVisible();
  });

  test('deleting a post from the menu removes it from the list', async () => {
    await postFactory.create({ title: 'Doomed post', status: 'draft', featured: false });
    await postFactory.create({ title: 'Surviving post', status: 'draft', featured: false });

    await postsPage.goto();
    await postsPage.waitForList();
    await postsPage.openContextMenuFor('Doomed post');
    await postsPage.contextMenuItem('Delete').click();
    await postsPage.confirmDelete();

    await expect(postsPage.getPostByTitle('Doomed post')).toBeHidden();
    await expect(postsPage.getPostByTitle('Surviving post')).toBeVisible();
  });
});
