import {test, expect} from '../../../helpers/playwright';
import {TagsPage} from '../../../helpers/pages/admin';
import {mockTagsResponse} from './helpers/mock-tags-response';
import {createPostFactory, createTagFactory, TagFactory} from '../../../data-factory';

test.describe('Ghost Admin - Tags', () => {
    let tagFactory: TagFactory;
    // Set labs flags for all tests in this describe block
    test.use({labs: {tagsX: true}});

    test.beforeEach(async ({page}) => {
        tagFactory = createTagFactory(page);
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
        const postFactory = createPostFactory(page);

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

    test('create new tag', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();

        await tagsPage.newTagButton.click();

        await expect(page).toHaveURL('/ghost/#/tags/new');
    });

    test('loads tags on scroll with pagination', async ({page}) => {
        const tagsPage = new TagsPage(page);

        // Mock first page of tags
        await mockTagsResponse(page, async (request) => {
            const url = new URL(request.url());
            const pageParam = parseInt(url.searchParams.get('page') || '1');
            const pageSize = 20;
            const pages = 3;
            const total = pageSize * (pages - 0.5);
            const offset = (pageParam - 1) * pageSize + 1;

            if (pageParam > 1) {
                // Simulate slow response for subsequent pages so that we can test the loading state
                await new Promise((resolve) => {
                    setTimeout(resolve, 500);
                });
            }

            return {
                meta: {
                    pagination: {
                        page: pageParam,
                        limit: pageSize,
                        pages,
                        total,
                        next: pageParam < pages ? pageParam + 1 : undefined
                    }
                },
                tags: Array.from({length: pageParam < pages ? pageSize : pageSize / 2}, (_, i) => ({
                    id: `${i + offset}`,
                    name: `Tag ${i + offset}`,
                    slug: `tag-${i + offset}`,
                    url: `https://example.com/tag-${i + offset}`,
                    description: `Tag ${i + offset} description`
                }))
            };
        });

        await tagsPage.goto();

        // Verify first page loads
        await expect(tagsPage.getRowByTitle('Tag 1')).toBeVisible();

        // Verify that only a limited number of tags are rendered
        expect(await tagsPage.tagListRow.count()).toBeGreaterThan(10);
        expect(await tagsPage.tagListRow.count()).toBeLessThan(40);

        // Scroll to bottom to trigger pagination
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();

        // Wait for loading placeholders to appear
        await expect(tagsPage.loadingPlaceholder.first()).toBeVisible();

        // Wait for second page to load
        await expect(tagsPage.getRowByTitle('Tag 21')).toBeVisible();

        // Scroll again to trigger loading of third page
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();

        // Wait for third page to load
        await expect(tagsPage.getRowByTitle('Tag 41')).toBeVisible();

        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();

        // Verify last tag is visible
        await expect(tagsPage.getRowByTitle('Tag 50')).toBeVisible();
    });
});
