import {PostFactory, createPostFactory} from '@/data-factory';
import {PostsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * Behaviours that are **deliberately** different between the Ember and React
 * posts lists.
 *
 * Everything the two screens agree on lives in `posts-list.test.ts`, where a
 * single test body runs against both. Anything that cannot go there needs a
 * written reason, and this is where it goes — so that a real regression can
 * never be quietly absorbed into "oh, that one's expected".
 *
 * Each test below states what differs, and why the difference was chosen. If a
 * reason stops holding, the test should move back into the shared file.
 *
 * Visual differences are **not** listed here. The two screens are not intended
 * to look alike yet — a design pass is still to come — and nothing in either
 * file asserts layout, spacing or colour.
 */

usePerTestIsolation();

test.describe('Ghost Admin - Posts List divergences (React only)', () => {
    // Flag state belongs on the describe — `test.use` inside a test body has
    // no effect on the fixtures that test already resolved.
    test.use({labs: {postsListReact: true}});

    let postFactory: PostFactory;
    let postsPage: PostsPage;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        postsPage = new PostsPage(page);
    });

    /**
     * Ember's "Copy preview link" copies `post.url` — the public permalink,
     * which for a draft points at a page that does not exist yet, and which is
     * the identical string its "Copy link to post" action produces. The two
     * menu items are indistinguishable.
     *
     * React copies the real `/p/<uuid>/` preview link. This is a fix, not a
     * port: the Ember behaviour is a bug worth reporting separately rather than
     * reproducing. Asserted only against React, because Ember would fail it.
     */
    test('React copies a real preview link for a draft', async ({page, context}) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await postFactory.create({title: 'Draft to preview', status: 'draft', featured: false});

        await postsPage.goto();
        await postsPage.waitForList();
        await postsPage.openContextMenuFor('Draft to preview');
        await postsPage.contextMenuItem('Copy preview link').click();

        const copied = await page.evaluate(() => navigator.clipboard.readText());
        expect(copied).toContain('/p/');
    });
});
