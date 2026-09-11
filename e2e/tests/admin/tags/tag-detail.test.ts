import { NewTagsPage, TagEditorPage, TagsPage } from '@/admin-pages';
import { TagFactory, createTagFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

/**
 * Behaviour contract for `/tags/:slug` and `/tags/new`. The React screen is
 * generally available (`tagDetailsReact` sits in GA_FEATURES), so every site
 * serves it; the assertions describe what the screen does rather than how it
 * is built.
 */

usePerTestIsolation();

test.describe('Ghost Admin - Tag Detail', () => {
  let tagFactory: TagFactory;

  test.beforeEach(({ page }) => {
    tagFactory = createTagFactory(page.request);
  });

  test('opening a tag from the list and editing it - changes are saved', async ({ page }) => {
    const tag = await tagFactory.create({
      name: 'Getting Started',
      slug: 'getting-started',
      feature_image: null,
    });
    const tagsPage = new TagsPage(page);
    const tagEditor = new TagEditorPage(page);

    await tagsPage.goto();
    await tagsPage.waitForPageToFullyLoad();
    await tagsPage.getTagLinkByName(tag.name).click();
    await expect(tagEditor.nameInput).toHaveValue('Getting Started');
    await expect(tagEditor.slugInput).toHaveValue('getting-started');

    await tagEditor.updateTag('Getting Started Updated', 'getting-started-updated');
    await tagEditor.goBackToTagsList();
    await tagsPage.waitForPageToFullyLoad();

    await expect(tagsPage.getTagLinkByName('Getting Started Updated')).toBeVisible();
    await expect(tagsPage.getTagLinkByName('Getting Started Updated')).toContainText(
      'getting-started-updated',
    );
  });

  test('creating a tag via the new tag screen - appears in the tags list', async ({ page }) => {
    const newTagsPage = new NewTagsPage(page);
    const tagsPage = new TagsPage(page);

    await newTagsPage.goto();
    await newTagsPage.createTag('Fresh Tag', 'fresh-tag');
    await newTagsPage.goBackToTagsList();
    await tagsPage.waitForPageToFullyLoad();

    await expect(tagsPage.getTagLinkByName('Fresh Tag')).toBeVisible();
    await expect(tagsPage.getTagLinkByName('Fresh Tag')).toContainText('fresh-tag');
  });

  test('deleting a tag from the detail screen - removed from the tags list', async ({ page }) => {
    const tag = await tagFactory.create({
      name: 'Disposable',
      slug: 'disposable',
      feature_image: null,
    });
    const tagsPage = new TagsPage(page);
    const tagEditor = new TagEditorPage(page);

    await tagEditor.gotoTagBySlug(tag.slug);
    await expect(tagEditor.nameInput).toHaveValue('Disposable');

    await tagEditor.deleteTag();
    await expect(tagEditor.deleteModal).toBeVisible();
    await tagEditor.confirmDelete();

    await expect(tagEditor.deleteModal).toBeHidden();
    await expect(page).toHaveURL(tagsPage.pageUrl);
    await tagsPage.waitForPageToFullyLoad();
    await expect(tagsPage.getTagLinkByName('Disposable')).toBeHidden();
  });
});
