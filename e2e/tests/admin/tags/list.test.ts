import {test, expect} from '../../../helpers/playwright';
import {TagsPage} from '../../../helpers/pages/admin';
import {overrideFeatureFlags} from '../../../helpers/utils';
import {mockTagsResponse} from './helpers/mock-tags-response';

test.describe('Ghost Admin - Tags', () => {
    test.beforeEach(async ({page}) => {
        await overrideFeatureFlags(page, {tagsX: true});
    });

    test('shows empty state when no tags exist', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await mockTagsResponse(page, async () => ({
            tags: []
        }));

        await tagsPage.goto();

        await expect(tagsPage.emptyStateTitle).toBeVisible();
        await expect(tagsPage.emptyStateAction).toBeVisible();
        await expect(tagsPage.tagList).not.toBeVisible();
    });

    test('lists public and internal tags separately', async ({page}) => {
        const tagsPage = new TagsPage(page);

        await mockTagsResponse(page, async request => ({
            tags: request.url().includes('internal')
                ? [
                    {
                        id: '1',
                        name: 'Internal Tag Name',
                        slug: 'internal-tag',
                        url: 'https://example.com/internal-tag',
                        description: 'Internal Tag description'
                    }
                ]
                : [
                    {
                        id: '2',
                        name: 'Public Tag Name',
                        slug: 'public-tag',
                        url: 'https://example.com/public-tag',
                        description: 'Public Tag description'
                    },
                    {
                        id: '3',
                        name: 'Other Public Tag Name',
                        slug: 'other-public-tag',
                        url: 'https://example.com/other-public-tag',
                        description: 'Other Public Tag description'
                    }
                ]
        }));

        await tagsPage.goto();

        // Default to public tags
        await expect(tagsPage.activeTab).toHaveText('Public tags');

        await expect(tagsPage.getRowByTitle('Public Tag Name')).toBeVisible();
        await expect(tagsPage.getRowByTitle('Public Tag Name')).toContainText('Public Tag description');
        await expect(tagsPage.tagListRow).toHaveCount(2);

        // Can switch to internal tags
        await tagsPage.selectTab('Internal tags');
        await expect(tagsPage.activeTab).toHaveText('Internal tags');
        await expect(tagsPage.getRowByTitle('Internal Tag Name')).toBeVisible();
        await expect(tagsPage.getRowByTitle('Internal Tag Name')).toContainText('Internal Tag description');
        await expect(tagsPage.tagListRow).toHaveCount(1);

        // Can switch back to public tags
        await tagsPage.selectTab('Public tags');
        await expect(tagsPage.activeTab).toHaveText('Public tags');
        await expect(tagsPage.getRowByTitle('Public Tag Name')).toBeVisible();
        await expect(tagsPage.tagListRow).toHaveCount(2);
    });

    test('lists tags', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await mockTagsResponse(page, async () => ({
            tags: [
                {
                    id: '1',
                    name: 'Tag 1',
                    slug: 'tag-1',
                    url: 'https://example.com/tag-1',
                    description: 'Tag 1 description',
                    count: {posts: 1}
                },
                {
                    id: '2',
                    name: 'Tag 2',
                    slug: 'tag-2',
                    url: 'https://example.com/tag-2',
                    description: 'Tag 2 description'
                },
                {
                    id: '3',
                    name: 'Tag 3',
                    slug: 'tag-3',
                    url: 'https://example.com/tag-3',
                    description: 'Tag 3 description'
                }
            ]
        }));

        await tagsPage.goto();

        await expect(tagsPage.getRowByTitle('Tag 1')).toBeVisible();
        await expect(tagsPage.getRowByTitle('Tag 1')).toContainText('Tag 1 description');
        await expect(tagsPage.getRowByTitle('Tag 1')).toContainText('1 post');

        await expect(tagsPage.tagListRow).toHaveCount(3);
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
