import {test, expect} from '../../../helpers/playwright';
import {TagsPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - Tags', () => {
    // XXX: Amend the settings response to enable tagsX feature flag for all tests
    // until we have a proper way to enable and disable feature flags in tests
    test.beforeEach(async ({page}) => {
        await page.route('/ghost/api/admin/settings/*', async (route) => {
            const response = await route.fetch();
            const json = await response.json();
            
            // Override the labs field to enable tagsX feature flag
            if (json.settings) {
                const labsSetting = json.settings.find(setting => setting.key === 'labs');
                if (labsSetting) {
                    const labs = JSON.parse(labsSetting.value || '{}');
                    labs.tagsX = true;
                    labsSetting.value = JSON.stringify(labs);
                }
            }
            
            await route.fulfill({
                response,
                json
            });
        });

        // Reload the page so that settings are updated and the feature flag is enabled
        await page.reload();
    });

    test('shows empty state when no tags exist', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.mockTagsResponse(async () => ({
            tags: []
        }));

        await tagsPage.goto();

        await expect(
            tagsPage.pageContent.getByRole('heading', {
                name: 'Start organizing your content'
            })
        ).toBeVisible();
        await expect(
            tagsPage.pageContent.getByRole('link', {
                name: 'Create a new tag'
            })
        ).toBeVisible();

        await expect(tagsPage.tagList).not.toBeVisible();
    });

    test('lists public and internal tags separately', async ({page}) => {
        const tagsPage = new TagsPage(page);

        await tagsPage.mockTagsResponse(async request => ({
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

        await expect(tagsPage.tagList).toBeVisible();
        await expect(tagsPage.tagListRow.first()).toContainText('Public Tag Name');
        await expect(tagsPage.tagListRow.first()).toContainText('Public Tag description');
        await expect(tagsPage.tagListRow).toHaveCount(2);

        // Can switch to internal tags
        await tagsPage.selectTab('Internal tags');
        await expect(tagsPage.activeTab).toHaveText('Internal tags');

        await expect(tagsPage.tagList).toBeVisible();
        await expect(tagsPage.tagListRow).toContainText('Internal Tag Name');
        await expect(tagsPage.tagListRow).toContainText('Internal Tag description');
        await expect(tagsPage.tagListRow).toHaveCount(1);

        // Can switch back to public tags
        await tagsPage.selectTab('Public tags');
        await expect(tagsPage.activeTab).toHaveText('Public tags');
        await expect(tagsPage.tagListRow.first()).toContainText('Public Tag Name');
        await expect(tagsPage.tagListRow).toHaveCount(2);
    });

    test('lists tags', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.mockTagsResponse(async () => ({
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

        await expect(tagsPage.tagListRow.getByRole('link', {name: 'Tag 1'})).toBeVisible();
        await expect(tagsPage.tagListRow.first().getByText('Tag 1 description')).toBeVisible();
        await expect(tagsPage.tagListRow.first().getByText('1 post')).toBeVisible();

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
        await tagsPage.mockTagsResponse(async (request) => {
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
        await expect(tagsPage.tagList).toBeVisible();
        await expect(tagsPage.tagListRow.getByRole('link', {name: 'Tag 1', exact: true})).toBeVisible();
        await expect(await tagsPage.tagListRow.count()).toBeGreaterThan(10);
        await expect(await tagsPage.tagListRow.count()).toBeLessThan(40);
        // Scroll to bottom to trigger pagination
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();

        // Wait for loading placeholders to appear
        const loadingPlaceholder = page.locator('[data-testid="loading-placeholder"]').first();
        await expect(loadingPlaceholder).toBeVisible();

        // Wait for second page to load
        await expect(tagsPage.tagListRow.getByRole('link', {name: 'Tag 21', exact: true})).toBeVisible();

        // Scroll again to trigger loading of third page
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();

        // Wait for third page to load
        await expect(tagsPage.tagListRow.getByRole('link', {name: 'Tag 41', exact: true})).toBeVisible();
        
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
        await tagsPage.tagListRow.last().scrollIntoViewIfNeeded();
        
        // Verify last tag is visible
        await expect(tagsPage.tagListRow.getByRole('link', {name: 'Tag 50', exact: true})).toBeVisible();
    });
});
