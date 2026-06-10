import {PagesPage, PostsPage} from '@/admin-pages';
import {createPageFactory, createPostFactory, createTagFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

function uniqueTitle(prefix: string) {
    return `${prefix} ${faker.string.alphanumeric(8)}`;
}

/**
 * Posts/pages list screen tests, shared between the Ember implementation
 * (labs flag off, the default) and the React implementation (labs flag
 * `postsListX` on).
 *
 * Tests are order-independent: every test creates its own data via factories
 * with unique titles, so the suite is safe under per-file environment reuse.
 */
export function definePostsListTests() {
    test('groups posts by status: scheduled, then drafts, then published', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const published = await postFactory.create({title: uniqueTitle('Published post'), status: 'published'});
        const draft = await postFactory.create({title: uniqueTitle('Draft post'), status: 'draft'});
        const scheduled = await postFactory.create({
            title: uniqueTitle('Scheduled post'),
            status: 'scheduled',
            published_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await expect(postsPage.getPostByTitle(scheduled.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(draft.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(published.title)).toBeVisible();

        await expect(postsPage.getPostStatus(scheduled.title)).toContainText('Scheduled');
        await expect(postsPage.getPostStatus(draft.title)).toContainText('Draft');
        await expect(postsPage.getPostStatus(published.title)).toContainText('Published');

        const titles = await postsPage.postsListItem.getByRole('heading', {level: 3}).allTextContents();
        const indexOf = (title: string) => titles.findIndex(text => text.includes(title));
        expect(indexOf(scheduled.title)).toBeLessThan(indexOf(draft.title));
        expect(indexOf(draft.title)).toBeLessThan(indexOf(published.title));
    });

    test('filters posts by type', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const draft = await postFactory.create({title: uniqueTitle('Type draft'), status: 'draft'});
        const published = await postFactory.create({title: uniqueTitle('Type published'), status: 'published'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();
        await postsPage.selectType('Draft posts');

        await expect(postsPage.getPostByTitle(draft.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(published.title)).toBeHidden();

        await postsPage.selectType('Published posts');

        await expect(postsPage.getPostByTitle(published.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(draft.title)).toBeHidden();
    });

    test('filters posts by visibility', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const paidPost = await postFactory.create({title: uniqueTitle('Paid post'), status: 'published', visibility: 'paid'});
        const publicPost = await postFactory.create({title: uniqueTitle('Public post'), status: 'published', visibility: 'public'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();
        await postsPage.selectVisibility('Paid members-only');

        await expect(postsPage.getPostByTitle(paidPost.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(publicPost.title)).toBeHidden();
    });

    test('filters posts by tag', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create({name: `Filter tag ${faker.string.alphanumeric(6)}`});
        const tagged = await postFactory.create({title: uniqueTitle('Tagged post'), status: 'published', tags: [{id: tag.id}]});
        const untagged = await postFactory.create({title: uniqueTitle('Untagged post'), status: 'published'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();
        await postsPage.selectTag(tag.name);

        await expect(postsPage.getPostByTitle(tagged.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(untagged.title)).toBeHidden();
    });

    test('orders published posts oldest first', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const older = await postFactory.create({
            title: uniqueTitle('Older post'),
            status: 'published',
            published_at: new Date('2020-01-01T10:00:00Z')
        });
        const newer = await postFactory.create({
            title: uniqueTitle('Newer post'),
            status: 'published',
            published_at: new Date('2024-01-01T10:00:00Z')
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();
        await postsPage.selectOrder('Oldest first');

        await expect(postsPage.getPostByTitle(older.title)).toBeVisible();
        // poll: the reordered list may render a moment after the refetch
        await expect.poll(async () => {
            const titles = await postsPage.postsListItem.getByRole('heading', {level: 3}).allTextContents();
            const indexOf = (title: string) => titles.findIndex(text => text.includes(title));
            return indexOf(older.title) < indexOf(newer.title);
        }).toBe(true);
    });

    test('opens with a type filter from the URL', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const draft = await postFactory.create({title: uniqueTitle('URL draft'), status: 'draft'});
        const published = await postFactory.create({title: uniqueTitle('URL published'), status: 'published'});

        const postsPage = new PostsPage(page);
        await postsPage.goto('/ghost/#/posts?type=draft');

        await expect(postsPage.getPostByTitle(draft.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(published.title)).toBeHidden();
    });

    test('features posts via the context menu', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const first = await postFactory.create({title: uniqueTitle('Feature one'), status: 'published', featured: false});
        const second = await postFactory.create({title: uniqueTitle('Feature two'), status: 'published', featured: false});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await postsPage.selectPost(first.title);
        await postsPage.selectPost(second.title);
        await postsPage.openContextMenu(second.title);
        // feature has no confirmation modal, so wait for the bulk request
        // before filtering — both implementations call the same endpoint
        const bulkResponse = page.waitForResponse(response => response.url().includes('/bulk/') && response.ok());
        await postsPage.contextMenuButton('Feature').click();
        await bulkResponse;

        await postsPage.selectType('Featured posts');

        await expect(postsPage.getPostByTitle(first.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(second.title)).toBeVisible();
    });

    test('adds a tag via the context menu', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const tagFactory = createTagFactory(page.request);
        const tag = await tagFactory.create({name: `Bulk tag ${faker.string.alphanumeric(6)}`});
        const post = await postFactory.create({title: uniqueTitle('Bulk tagged'), status: 'published'});
        const other = await postFactory.create({title: uniqueTitle('Not tagged'), status: 'published'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await postsPage.openContextMenu(post.title);
        await postsPage.contextMenuButton('Add a tag').click();

        await expect(postsPage.addTagsModal).toBeVisible();
        await postsPage.addTagsModal.getByRole('searchbox').fill(tag.name);
        await page.getByRole('option', {name: tag.name}).click();
        // dismiss the tag dropdown (it can overlay the modal footer) without
        // closing the modal, then confirm
        await postsPage.addTagsModal.getByRole('heading', {name: 'Add tags'}).click();
        await postsPage.addTagsModal.getByRole('button', {name: 'Add', exact: true}).click();
        await expect(postsPage.addTagsModal).toBeHidden();

        await postsPage.selectTag(tag.name);

        await expect(postsPage.getPostByTitle(post.title)).toBeVisible();
        await expect(postsPage.getPostByTitle(other.title)).toBeHidden();
    });

    test('unpublishes a post via the context menu', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: uniqueTitle('To unpublish'), status: 'published'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await postsPage.openContextMenu(post.title);
        await postsPage.contextMenuButton('Unpublish').click();

        await expect(postsPage.unpublishPostsModal).toBeVisible();
        await postsPage.unpublishPostsModal.getByRole('button', {name: 'Unpublish', exact: true}).click();
        await expect(postsPage.unpublishPostsModal).toBeHidden();

        await expect(postsPage.getPostStatus(post.title)).toContainText('Draft');
    });

    test('deletes a post via the context menu', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: uniqueTitle('To delete'), status: 'published'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await postsPage.openContextMenu(post.title);
        await postsPage.contextMenuButton('Delete').click();

        await expect(postsPage.deletePostsModal).toBeVisible();
        await postsPage.deletePostsModal.getByRole('button', {name: 'Delete', exact: true}).click();
        await expect(postsPage.deletePostsModal).toBeHidden();

        await expect(postsPage.getPostByTitle(post.title)).toBeHidden();
    });

    test('duplicates a post via the context menu', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: uniqueTitle('To duplicate'), status: 'published'});

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await postsPage.openContextMenu(post.title);
        await postsPage.contextMenuButton('Duplicate').click();

        await expect(postsPage.getPostByTitle(`${post.title} (Copy)`)).toBeVisible();
    });

    test('lists pages and filters by type from the URL', async ({page}) => {
        const pageFactory = createPageFactory(page.request);
        const draftPage = await pageFactory.create({title: uniqueTitle('Draft page'), status: 'draft'});
        const publishedPage = await pageFactory.create({title: uniqueTitle('Published page'), status: 'published'});

        const pagesPage = new PagesPage(page);
        await pagesPage.goto();
        await pagesPage.waitForPageToFullyLoad();

        await expect(pagesPage.getPostByTitle(draftPage.title)).toBeVisible();
        await expect(pagesPage.getPostByTitle(publishedPage.title)).toBeVisible();

        await pagesPage.goto('/ghost/#/pages?type=draft');

        await expect(pagesPage.getPostByTitle(draftPage.title)).toBeVisible();
        await expect(pagesPage.getPostByTitle(publishedPage.title)).toBeHidden();
    });
}
