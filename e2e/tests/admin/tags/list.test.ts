import {test, expect} from '../../../helpers/playwright';
import {TagsPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - Tags', () => {
    test('shows empty state when no tags exist', async ({page}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.mockTagsResponse(() => ({
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

        await tagsPage.mockTagsResponse(request => ({
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
        await tagsPage.mockTagsResponse(() => ({
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
});
