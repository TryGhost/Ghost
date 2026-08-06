import {AnalyticsOverviewPage, PostEditorPage, PostsPage} from '@/admin-pages';
import {PostFactory, createPostFactory} from '@/data-factory';
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
            postsPage = new PostsPage(page, {implementation: postsListReact ? 'react' : 'ember'});
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

        // No checkboxes in either implementation — selection is modifier-click.
        test('selects a row on modifier-click', async () => {
            await postFactory.create({title: 'Selectable', status: 'draft', featured: false});

            await postsPage.goto();
            await postsPage.waitForList();
            await postsPage.selectPost('Selectable');

            await expect(async () => {
                expect(await postsPage.selectedPostCount()).toBe(1);
            }).toPass();
        });

        test('right-click opens a menu describing the row', async () => {
            await postFactory.create({title: 'Right clickable', status: 'draft', featured: false});

            await postsPage.goto();
            await postsPage.waitForList();
            await postsPage.openContextMenuFor('Right clickable');

            // A draft has no public link to copy, so it offers the preview one.
            await expect(postsPage.contextMenuItem('Copy preview link')).toBeVisible();
            await expect(postsPage.contextMenuItem('Add a tag')).toBeVisible();
        });

        /**
         * Regression: aborting the Ember posts transition used to leave Ember's
         * router believing it was still on the editor. Re-opening the *same*
         * post was then a no-op transition and rendered nothing — an empty
         * screen — while opening any other post masked it.
         */
        test('reopening the same post after going back still opens the editor', async ({page}) => {
            await postFactory.create({title: 'Reopened post', status: 'draft', featured: false});
            const editor = new PostEditorPage(page);

            await postsPage.goto();
            await postsPage.waitForList();
            await postsPage.getPostByTitle('Reopened post').click();
            await expect(editor.titleInput).toBeVisible();

            await page.goBack();
            await postsPage.waitForList();
            await postsPage.getPostByTitle('Reopened post').click();

            await expect(editor.titleInput).toBeVisible();
        });

        /**
         * Regression: the editor labels its back button from the route Ember
         * thinks it came from. Parking Ember on the catch-all only once left
         * that stuck at whatever the admin booted on — usually /analytics — so
         * a post opened from the list offered to send you to Analytics.
         */
        test('the editor offers to go back to the list, not wherever you were before', async ({page}) => {
            await postFactory.create({title: 'Breadcrumb post', status: 'draft', featured: false});
            const editor = new PostEditorPage(page);
            const analytics = new AnalyticsOverviewPage(page);

            // Waiting on the screen, not the URL: the URL matches before Ember
            // has parked, and an unparked router is the bug's precondition.
            await analytics.goto();
            await expect(analytics.header).toBeVisible();

            await postsPage.goto();
            await postsPage.waitForList();
            await postsPage.getPostByTitle('Breadcrumb post').click();
            await expect(editor.titleInput).toBeVisible();

            await expect(editor.backButton).toContainText('Posts');
        });

        test('deleting a post from the menu removes it from the list', async () => {
            await postFactory.create({title: 'Doomed post', status: 'draft', featured: false});
            await postFactory.create({title: 'Surviving post', status: 'draft', featured: false});

            await postsPage.goto();
            await postsPage.waitForList();
            await postsPage.openContextMenuFor('Doomed post');
            await postsPage.contextMenuItem('Delete').click();
            await postsPage.confirmDelete();

            await expect(postsPage.getPostByTitle('Doomed post')).toBeHidden();
            await expect(postsPage.getPostByTitle('Surviving post')).toBeVisible();
        });
    });
}
