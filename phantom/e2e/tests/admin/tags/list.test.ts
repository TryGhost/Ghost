// Vendored from /e2e/tests/admin/tags/list.test.ts (pagination/scroll case
// still pending: needs paginated tag browse)
import {TagEditorPage, TagsPage} from '../../../helpers/pages';
import {TagFactory, createPostFactory, createTagFactory} from '../../../helpers/data-factory';
import {expect, test} from '../../../helpers/fixture';

test.describe('Ghost Admin - Tags', () => {
    let tagFactory: TagFactory;

    test.beforeEach(async ({page}) => {
        tagFactory = createTagFactory(page.request);
    });

    test('shows empty list with call to action buttons', async ({page}) => {
        const tagsPage = new TagsPage(page);
        const tagEditorPage = new TagEditorPage(page);

        // By default there will be one tag with slug 'news'
        await tagEditorPage.gotoTagBySlug('news');
        await tagEditorPage.deleteTag();
        await tagEditorPage.confirmDelete();
        await tagsPage.waitForPageToFullyLoad();

        // Once the tag is deleted, the page will redirect to the tags list
        await expect(tagsPage.title('Start organizing your content')).toBeVisible();
        await expect(tagsPage.createNewTagButton).toBeVisible();
    });

    test('lists the default tags list when no new tags were created', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        await expect(tagsPage.activeTab).toHaveText('Public tags');
        await expect(tagsPage.getRowByTitle('News')).toBeVisible();
        await expect(tagsPage.tagListRow).toHaveCount(1);
    });

    test('lists public and internal tags separately', async ({page}) => {
        await tagFactory.create({
            name: '#Internal Tag Name',
            slug: 'internal-tag',
            description: 'Internal Tag description'
        });

        await tagFactory.create({
            name: 'Public Tag Name',
            slug: 'public-tag',
            description: 'Public Tag description'
        });

        await tagFactory.create({
            name: 'Other Public Tag Name',
            slug: 'other-public-tag',
            description: 'Other Public Tag description'
        });

        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        await expect(tagsPage.activeTab).toHaveText('Public tags');
        await expect(tagsPage.getRowByTitle('Public Tag Name')).toBeVisible();
        await expect(tagsPage.getRowByTitle('Public Tag Name')).toContainText('Public Tag description');
        await expect(tagsPage.tagListRow).toHaveCount(3);

        await tagsPage.selectTab('Internal tags');
        await expect(tagsPage.activeTab).toHaveText('Internal tags');
        await expect(tagsPage.getRowByTitle('#Internal Tag Name')).toBeVisible();
        await expect(tagsPage.getRowByTitle('#Internal Tag Name')).toContainText('Internal Tag description');
        await expect(tagsPage.tagListRow).toHaveCount(1);

        await tagsPage.selectTab('Public tags');
        await expect(tagsPage.activeTab).toHaveText('Public tags');
        await expect(tagsPage.getRowByTitle('Public Tag Name')).toBeVisible();
        await expect(tagsPage.tagListRow).toHaveCount(3);
    });

    test('lists tags with posts count', async ({page}) => {
        const tagsPage = new TagsPage(page);
        const postFactory = createPostFactory(page.request);

        const tag = await tagFactory.create({
            name: 'Tag 1',
            slug: 'tag-1',
            description: 'Tag 1 description'
        });

        await postFactory.create({
            status: 'published',
            tags: [{id: tag.id}]
        });

        await tagsPage.goto();

        await expect(tagsPage.getRowByTitle('Tag 1')).toBeVisible();
        await expect(tagsPage.getRowByTitle('Tag 1')).toContainText('Tag 1 description');
        await expect(tagsPage.getRowByTitle('Tag 1')).toContainText('1 post');
        await expect(tagsPage.tagListRow).toHaveCount(2);
    });

    test('creates new tag', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        await tagsPage.newTagButton.click();

        await expect(page).toHaveURL('/ghost/#/tags/new');
    });
});
