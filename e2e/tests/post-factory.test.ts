import {PostPage} from '@/helpers/pages';
import {PostsPage} from '@/admin-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import type {PostFactory} from '@/data-factory';

test.describe('Post Factory API Integration', () => {
    let postFactory: PostFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
    });

    test('create a post and view it on the frontend', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post from Factory',
            status: 'published'
        });

        expect(post.id).toBeTruthy();
        expect(post.slug).toBeTruthy();
        expect(post.status).toBe('published');

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);
        await expect(postPage.postTitle).toContainText('Test Post from Factory');
    });

    test('create a post visible in Ghost Admin', async ({page}) => {
        const uniqueTitle = `Admin Test Post ${Date.now()}`;
        const post = await postFactory.create({
            title: uniqueTitle,
            status: 'published'
        });

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await expect(postsPage.getPostByTitle(post.title)).toBeVisible();
    });

    test('create draft post that is not accessible on frontend', async ({page}) => {
        const draftPost = await postFactory.create({
            title: 'Draft Post from Factory',
            status: 'draft'
        });

        expect(draftPost.status).toBe('draft');
        expect(draftPost.published_at).toBeNull();

        // TODO: Replace this with a 404 page object
        const response = await page.goto(`/${draftPost.slug}/`, {
            waitUntil: 'domcontentloaded'
        });
        expect(response?.status()).toBe(404);
    });
});
