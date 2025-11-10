import {Page} from '@playwright/test';
import {TagEditorPage, TagsPage} from '../../../helpers/pages/admin';
import {TagFactory, createPostFactory,createTagFactory} from '../../../data-factory';
import {expect, test} from '../../../helpers/playwright';

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
        await tagFactory.create(
            {
                name: '#Internal Tag Name',
                slug: 'internal-tag',
                url: 'https://example.com/internal-tag',
                description: 'Internal Tag description'
            }
        );

        await tagFactory.create({
            name: 'Public Tag Name',
            slug: 'public-tag',
            url: 'https://example.com/public-tag',
            description: 'Public Tag description'
        });

        await tagFactory.create({
            name: 'Other Public Tag Name',
            slug: 'other-public-tag',
            url: 'https://example.com/other-public-tag',
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
            url: 'https://example.com/tag-1',
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

    test.describe('slow requests', () => {
        // Simulate slow response for subsequent pages so that we can test the loading state
        async function slowDownApiRequests(page: Page, urlPattern: string) {
            await page.route(urlPattern, async (route) => {
                const url = new URL(route.request().url());
                // Force smaller page size to enable pagination
                url.searchParams.set('limit', '20');

                const pageParam = parseInt(url.searchParams.get('page') || '1');

                if (pageParam > 1) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 500);
                    });
                }

                await route.continue({url: url.toString()});
            });
        }

        test('loads tags on scroll with pagination', async ({page}) => {
            await Promise.all(
                Array.from({length: 50}, async (_, i) => {
                    const num = String(i + 1).padStart(2, '0');
                    return await tagFactory.create({
                        name: `Tag ${num}`,
                        slug: `tag-${num}`,
                        url: 'https://example.com',
                        description: 'description'
                    });
                })
            );

            await slowDownApiRequests(page, '**/ghost/api/admin/tags/*');
            const tagsPage = new TagsPage(page);

            await tagsPage.goto();

            // Verify page loads
            await expect(tagsPage.getRowByTitle('Tag 01')).toBeVisible();

            // Verify that only a limited number of tags are rendered
            expect(await tagsPage.tagListRow.count()).toBeGreaterThan(10);
            expect(await tagsPage.tagListRow.count()).toBeLessThan(40);

            // Scroll to the bottom to trigger loading and wait for more tags to appear
            await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
            await expect(tagsPage.getRowByTitle('Tag 21')).toBeVisible();

            // Scroll again to trigger loading and wait for more tags to appear
            await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
            await expect(tagsPage.getRowByTitle('Tag 41')).toBeVisible();

            // Verify that all tags including last are rendered
            await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
            await expect(tagsPage.getRowByTitle('Tag 50')).toBeVisible();
        });
    });
});
