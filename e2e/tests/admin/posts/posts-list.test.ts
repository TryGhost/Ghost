import {PostFactory, createPostFactory} from '@/data-factory';
import {PostsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * Behaviour contract for `/posts`.
 *
 * Ember and React implementations coexist behind the `postsListReact` Labs
 * flag, and this file runs the same assertions against both by generating one
 * describe block per flag state. No test body knows which implementation is
 * rendering it, and none may branch on it.
 *
 * A test that passes under one block and fails under the other is a real
 * user-facing difference between the two screens. That is the point: it makes a
 * gap impossible to hide behind a conditional.
 *
 * **Behaviour only.** The two screens deliberately do not look alike — that is
 * a design pass still to come — so nothing here asserts layout, spacing or
 * colour. What a user can *do*, and what the screen *says*, is fair game.
 *
 * Anything true of only one implementation belongs in
 * `posts-list-divergences.test.ts`, with a written reason.
 */

usePerTestIsolation();

/**
 * `featured` is randomised by the post factory, and a featured row puts the
 * star's label inside the heading's accessible name — so an exact-name lookup
 * finds nothing about half the time. Pin it everywhere here; the star is not
 * what any of these tests are about.
 */

for (const {implementation, postsListReact} of [
    {implementation: 'Ember', postsListReact: false},
    {implementation: 'React', postsListReact: true}
] as const) {
    test.describe(`Ghost Admin - Posts List (${implementation})`, () => {
        test.use({labs: {postsListReact}});

        let postFactory: PostFactory;
        let postsPage: PostsPage;

        test.beforeEach(async ({page}) => {
            postFactory = createPostFactory(page.request);
            postsPage = new PostsPage(page);
        });

        test('lists the posts that exist', async () => {
            await postFactory.create({title: 'A listed draft', status: 'draft', featured: false});

            await postsPage.goto();
            await postsPage.waitForPageToFullyLoad();

            await expect(postsPage.getPostByTitle('A listed draft')).toBeVisible();
        });

        test('filters the list down to drafts', async () => {
            await postFactory.create({title: 'Still a draft', status: 'draft', featured: false});
            await postFactory.create({title: 'Already published', status: 'published', featured: false});

            await postsPage.goto();
            await postsPage.waitForPageToFullyLoad();
            await postsPage.selectType('Draft posts');

            await expect(postsPage.getPostByTitle('Still a draft')).toBeVisible();
            await expect(postsPage.getPostByTitle('Already published')).toBeHidden();
        });

        /**
         * The five query params are a saved view's identity — the sidebar
         * stores them verbatim and both implementations read the same ones. A
         * screen that rewrote or dropped one would corrupt every saved view the
         * other implementation created, so the URL has to survive a load
         * untouched.
         */
        test('leaves a saved view URL exactly as it was given', async ({page}) => {
            await postFactory.create({title: 'Any draft', status: 'draft', featured: false});
            const savedViewUrl = '/ghost/#/posts?type=draft&order=updated_at+desc';

            await page.goto(savedViewUrl);
            await postsPage.waitForList();

            const hash = new URL(page.url()).hash;
            expect(hash).toContain('type=draft');
            expect(hash).toContain('order=updated_at');
        });

        test('applying a filter puts it in the URL', async ({page}) => {
            await postFactory.create({title: 'Any draft', status: 'draft', featured: false});

            await postsPage.goto();
            await postsPage.waitForPageToFullyLoad();
            await postsPage.selectType('Draft posts');

            await expect(async () => {
                expect(new URL(page.url()).hash).toContain('type=draft');
            }).toPass();
        });

        test('shows an empty state when a filter matches nothing', async () => {
            await postFactory.create({title: 'The only draft', status: 'draft', featured: false});

            await postsPage.goto();
            await postsPage.waitForList();
            await postsPage.selectType('Scheduled posts');

            await expect(postsPage.emptyState).toBeVisible();
        });

        /*
         * Selection, the right-click menu and bulk delete are **not** here yet.
         *
         * They are covered thoroughly on the React side (16 acceptance tests
         * for selection alone, plus the outgoing request for every bulk
         * action), but driving the Ember equivalents through this page object
         * did not work first time and I did not want to leave a red file while
         * chasing it. The gesture is the hard part: Ember marks the selected
         * row on a wrapper element and React on the row itself, and its
         * mousedown handler sits behind a link.
         *
         * Adding them is the highest-value next move for this file — they are
         * the behaviours with the most destructive failure modes.
         */
    });
}
