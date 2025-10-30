import {NewTagsPage, TagEditorPage, TagsPage} from '../../../helpers/pages/admin';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Tags Editor', () => {
    test('can add tags', async ({page}) => {
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

    test('can edit tags', async ({page}) => {
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

        await tagEditor.updateTag('New tag name', 'new-tag-slug');
        await tagEditor.goBackToTagsList();
        await tagsPage.waitForPageToFullyLoad();

        await expect(tagsPage.getTagLinkByName('New tag name')).toBeVisible();
        await expect(tagsPage.getTagLinkByName('New tag name')).toContainText('new-tag-slug');
    });

    test('does not create duplicates when editing a tag', async ({page}) => {
        const tagsPage = new TagsPage(page);
        const tagEditor = new TagEditorPage(page);
        await tagsPage.goto();

        await expect(tagsPage.tagListRow).toHaveCount(1);

        await tagsPage.getRowByTitle('News').click();
        await tagEditor.fillTagName('Edited Tag Name');
        await tagEditor.save();
        await tagEditor.goBackToTagsList();
        await tagsPage.waitForPageToFullyLoad();

        await expect(tagsPage.tagListRow).toHaveCount(1);
        await expect(tagsPage.getTagLinkByName('Edited Tag Name')).toBeVisible();
    });

    test('can delete tag without posts', async ({page}) => {
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

        await expect(tagEditor.deleteModal).not.toBeVisible();
        await expect(page).toHaveURL(tagsPage.pageUrl);
        await expect(tagsPage.tagListRow).toHaveCount(1);
    });

    test('can delete tags with posts', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();
        await tagsPage.getTagLinkByName('News').click();

        const tagEditor = new TagEditorPage(page);
        await tagEditor.deleteTag();

        await expect(tagEditor.deleteModal).toBeVisible();
        await expect(tagEditor.deleteModalPostsCount).toContainText('1 post');

        await tagEditor.confirmDelete();

        await expect(tagEditor.deleteModal).not.toBeVisible();
        await expect(page).toHaveURL(tagsPage.pageUrl);
        await expect(tagsPage.getTagLinkByName('News')).not.toBeVisible();
    });

    test('can load tag via slug in url', async ({page}) => {
        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug('news');

        await expect(page).toHaveURL('/ghost/#/tags/news');
        await expect(tagEditor.nameInput).toHaveValue('News');
        await expect(tagEditor.slugInput).toHaveValue('news');
    });

    test('redirects to 404 when tag does not exist', async ({page}) => {
        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug('unknown');

        await expect(page.getByText('Page not found')).toBeVisible();
    });

    test('maintains active state in nav menu when creating a new tag', async ({page}) => {
        const newTagsPage = new NewTagsPage(page);
        await newTagsPage.goto();

        await expect(page).toHaveURL(newTagsPage.pageUrl);
        await expect(newTagsPage.navMenuItem).toHaveClass(/active/);
    });

    test('maintains active state in nav menu when editing a tag', async ({page}) => {
        const tagsPage = new TagsPage(page);

        await tagsPage.goto();
        await tagsPage.getTagLinkByName('News').click();

        const tagEditor = new TagEditorPage(page);
        await expect(tagEditor.navMenuItem).toHaveClass(/active/);
    });
});

