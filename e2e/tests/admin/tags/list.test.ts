import {Page} from '@playwright/test';
import {TagEditorPage, TagsPage} from '@/admin-pages';
import {TagFactory, createTagFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Tags', () => {
    let tagFactory: TagFactory;

    test.beforeEach(async ({page}) => {
        tagFactory = createTagFactory(page.request);
    });

    // Read-only list rendering (default list, public/internal split, posts count)
    // is covered by apps/admin/src/tags/tags.acceptance.test.tsx.
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
