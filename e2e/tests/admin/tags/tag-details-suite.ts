import {NewTagsPage, SidebarPage, TagEditorPage, TagsPage} from '@/admin-pages';
import {createPostFactory, createTagFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

function uniqueName(prefix: string) {
    return `${prefix} ${faker.string.alphanumeric(6)}`;
}

function uniqueSlug(prefix: string) {
    return `${prefix}-${faker.string.alphanumeric(6).toLowerCase()}`;
}

/**
 * Tag detail screen tests, shared between the Ember implementation (labs flag
 * off, the default) and the React implementation (labs flag `tagDetailsX` on).
 *
 * Tests are intentionally order-independent: every test creates its own data
 * via factories or the UI with unique names, so the suite is safe under
 * per-file environment reuse.
 */
export function defineTagDetailsTests() {
    test('can add tags', async ({page}) => {
        const name = uniqueName('New tag');
        const slug = uniqueSlug('new-tag');

        const newTagsPage = new NewTagsPage(page);
        await newTagsPage.goto();
        await newTagsPage.createTag(name, slug);
        await new TagEditorPage(page).goBackToTagsList();

        const tagsPage = new TagsPage(page);
        await tagsPage.waitForPageToFullyLoad();

        await expect(tagsPage.getTagLinkByName(name)).toBeVisible();
        await expect(tagsPage.getTagLinkByName(name)).toContainText(slug);
        await expect(tagsPage.getTagLinkByName(name)).toContainText('0 posts');
    });

    test('can edit tags', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();
        const newName = uniqueName('Edited tag');
        const newSlug = uniqueSlug('edited-tag');

        const tagsPage = new TagsPage(page);
        await tagsPage.goto();
        await tagsPage.waitForPageToFullyLoad();
        await tagsPage.getTagLinkByName(tag.name).click();
        await expect(page).toHaveURL(`/ghost/#/tags/${tag.slug}`);

        const tagEditor = new TagEditorPage(page);
        await expect(tagEditor.nameInput).toHaveValue(tag.name);
        await expect(tagEditor.slugInput).toHaveValue(tag.slug);

        await tagEditor.updateTag(newName, newSlug);
        await tagEditor.goBackToTagsList();
        await tagsPage.waitForPageToFullyLoad();

        await expect(tagsPage.getTagLinkByName(newName)).toBeVisible();
        await expect(tagsPage.getTagLinkByName(newName)).toContainText(newSlug);
    });

    test('does not create duplicates when editing a tag', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();
        const newName = uniqueName('Renamed tag');

        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);
        await tagEditor.fillTagName(newName);
        await tagEditor.save();
        await tagEditor.goBackToTagsList();

        const tagsPage = new TagsPage(page);
        await tagsPage.waitForPageToFullyLoad();

        await expect(tagsPage.getTagLinkByName(newName)).toHaveCount(1);
        await expect(tagsPage.getTagLinkByName(tag.name)).toBeHidden();
    });

    test('can delete tag without posts', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();

        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);
        await tagEditor.deleteTag();

        await expect(tagEditor.deleteModal).toBeVisible();
        await tagEditor.confirmDelete();

        const tagsPage = new TagsPage(page);
        await expect(tagEditor.deleteModal).toBeHidden();
        await expect(page).toHaveURL(tagsPage.pageUrl);
        await tagsPage.waitForPageToFullyLoad();
        await expect(tagsPage.getTagLinkByName(tag.name)).toBeHidden();
    });

    test('can delete tags with posts', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const postFactory = createPostFactory(page.request);
        const tag = await tagFactory.create();
        await postFactory.create({status: 'published', tags: [{id: tag.id}]});

        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);
        await tagEditor.deleteTag();

        await expect(tagEditor.deleteModal).toBeVisible();
        await expect(tagEditor.deleteModalPostsCount).toContainText('1 post');

        await tagEditor.confirmDelete();

        const tagsPage = new TagsPage(page);
        await expect(tagEditor.deleteModal).toBeHidden();
        await expect(page).toHaveURL(tagsPage.pageUrl);
        await tagsPage.waitForPageToFullyLoad();
        await expect(tagsPage.getTagLinkByName(tag.name)).toBeHidden();
    });

    test('can load tag via slug in url', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();

        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);

        await expect(page).toHaveURL(`/ghost/#/tags/${tag.slug}`);
        await expect(tagEditor.nameInput).toHaveValue(tag.name);
        await expect(tagEditor.slugInput).toHaveValue(tag.slug);
    });

    test('redirects to 404 when tag does not exist', async ({page}) => {
        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug('unknown');

        await expect(page.getByText('Page not found')).toBeVisible();
    });

    test('warns about unsaved changes - staying keeps the edits', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();

        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);
        await tagEditor.fillTagName('Unsaved tag name');
        await tagEditor.goBackToTagsList();

        await expect(tagEditor.unsavedChangesModal).toBeVisible();
        await tagEditor.unsavedChangesStayButton.click();

        await expect(tagEditor.unsavedChangesModal).toBeHidden();
        await expect(page).toHaveURL(`/ghost/#/tags/${tag.slug}`);
        await expect(tagEditor.nameInput).toHaveValue('Unsaved tag name');
    });

    test('warns about unsaved changes - leaving discards the edits', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();

        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);
        await tagEditor.fillTagName('Discarded tag name');
        await tagEditor.goBackToTagsList();

        await expect(tagEditor.unsavedChangesModal).toBeVisible();
        await tagEditor.unsavedChangesLeaveButton.click();

        const tagsPage = new TagsPage(page);
        await tagsPage.waitForPageToFullyLoad();
        await expect(tagsPage.getTagLinkByName(tag.name)).toBeVisible();
        await expect(tagsPage.getTagLinkByName('Discarded tag name')).toBeHidden();
    });

    test('can edit meta data', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();

        const tagEditor = new TagEditorPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);

        await tagEditor.expandMetaData();
        await tagEditor.metaTitleInput.fill('Custom meta title');
        await tagEditor.metaDescriptionInput.fill('Custom meta description');
        await tagEditor.canonicalUrlInput.fill('https://example.com/canonical/');
        await tagEditor.save();

        await page.reload();
        await tagEditor.expandMetaData();

        await expect(tagEditor.metaTitleInput).toHaveValue('Custom meta title');
        await expect(tagEditor.metaDescriptionInput).toHaveValue('Custom meta description');
        await expect(tagEditor.canonicalUrlInput).toHaveValue('https://example.com/canonical/');
    });

    test('maintains active state in nav menu when creating a new tag', async ({page}) => {
        const newTagsPage = new NewTagsPage(page);
        const sidebar = new SidebarPage(page);
        await newTagsPage.goto();

        await expect(page).toHaveURL(newTagsPage.pageUrl);
        await expect(sidebar.getNavLink('Tags')).toHaveAttribute('aria-current', 'page');
    });

    test('maintains active state in nav menu when editing a tag', async ({page}) => {
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create();

        const tagEditor = new TagEditorPage(page);
        const sidebar = new SidebarPage(page);
        await tagEditor.gotoTagBySlug(tag.slug);

        await expect(tagEditor.nameInput).toHaveValue(tag.name);
        await expect(sidebar.getNavLink('Tags')).toHaveAttribute('aria-current', 'page');
    });
}
