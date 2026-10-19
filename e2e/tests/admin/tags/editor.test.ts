import { NewTagsPage, TagEditorPage, TagsPage } from '@/admin-pages';
import { createTagFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';

// Tests share one Ghost environment, so each one owns its tags
test.describe('Ghost Admin - Tags Editor', () => {
  test('can add tags', async ({ page }) => {
    const newTagsPage = new NewTagsPage(page);
    await newTagsPage.goto();
    await newTagsPage.createTag('New tag name', 'new-tag-slug');
    await new TagEditorPage(page).goBackToTagsList();

    const tagsPage = new TagsPage(page);
    await tagsPage.waitForPageToFullyLoad();

    await expect(tagsPage.getTagLinkByName('New tag name')).toBeVisible();
    await expect(tagsPage.getTagLinkByName('New tag name')).toContainText('new-tag-slug');
    await expect(tagsPage.getTagLinkByName('New tag name')).toContainText('0 posts');
  });

  test('can edit tags', async ({ page }) => {
    const tagEditor = new TagEditorPage(page);
    const tagsPage = new TagsPage(page);

    const newTagsPage = new NewTagsPage(page);
    await newTagsPage.goto();

    await newTagsPage.createTag('To be edited', 'to-be-edited');
    await tagEditor.goBackToTagsList();
    await tagsPage.waitForPageToFullyLoad();

    await tagsPage.getTagLinkByName('To be edited').click();
    await expect(page).toHaveURL('/ghost/#/tags/to-be-edited');

    await expect(tagEditor.nameInput).toHaveValue('To be edited');
    await expect(tagEditor.slugInput).toHaveValue('to-be-edited');

    await tagEditor.updateTag('Edited tag name', 'edited-tag-slug');
    await tagEditor.goBackToTagsList();
    await tagsPage.waitForPageToFullyLoad();

    await expect(tagsPage.getTagLinkByName('Edited tag name')).toBeVisible();
    await expect(tagsPage.getTagLinkByName('Edited tag name')).toContainText('edited-tag-slug');
  });

  test('does not create duplicates when editing a tag', async ({ page }) => {
    const tagsPage = new TagsPage(page);
    const tagEditor = new TagEditorPage(page);
    const tag = await createTagFactory(page.request).create({
      name: 'To be renamed',
      feature_image: null,
    });
    await tagsPage.goto();

    await expect(tagsPage.getTagLinkByName(tag.name)).toBeVisible();
    const rowCount = await tagsPage.tagListRow.count();

    await tagsPage.getRowByTitle(tag.name).click();
    await tagEditor.fillTagName('Renamed Tag Name');
    await tagEditor.save();
    await tagEditor.goBackToTagsList();
    await tagsPage.waitForPageToFullyLoad();

    await expect(tagsPage.getTagLinkByName('Renamed Tag Name')).toBeVisible();
    await expect(tagsPage.tagListRow).toHaveCount(rowCount);
  });

  test('can delete tag without posts', async ({ page }) => {
    const keptTag = await createTagFactory(page.request).create({
      name: 'To be kept',
      feature_image: null,
    });
    const newTagsPage = new NewTagsPage(page);
    await newTagsPage.goto();

    await newTagsPage.createTag('To be deleted', 'to-be-deleted');
    await newTagsPage.goBackToTagsList();

    const tagsPage = new TagsPage(page);
    await tagsPage.waitForPageToFullyLoad();

    const tagEditor = new TagEditorPage(page);
    await tagsPage.getTagLinkByName('To be deleted').click();
    await tagEditor.deleteTag();

    await expect(tagEditor.deleteModal).toBeVisible();
    await tagEditor.confirmDelete();

    await expect(tagEditor.deleteModal).toBeHidden();
    await expect(page).toHaveURL(tagsPage.pageUrl);
    await expect(tagsPage.getTagLinkByName(keptTag.name)).toBeVisible();
    await expect(tagsPage.getTagLinkByName('To be deleted')).toBeHidden();
  });

  test('can delete tags with posts', async ({ page }) => {
    const tagsPage = new TagsPage(page);
    await tagsPage.goto();
    await tagsPage.getTagLinkByName('News').click();

    const tagEditor = new TagEditorPage(page);
    await tagEditor.deleteTag();

    await expect(tagEditor.deleteModal).toBeVisible();
    await expect(tagEditor.deleteModalPostsCount).toContainText('1 post');

    await tagEditor.confirmDelete();

    await expect(tagEditor.deleteModal).toBeHidden();
    await expect(page).toHaveURL(tagsPage.pageUrl);
    await expect(tagsPage.getTagLinkByName('News')).toBeHidden();
  });
});
