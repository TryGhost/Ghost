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
    test('React copies a real preview link for a draft', async ({page}) => {
        // Recorded rather than read back: clipboard *read* permission is
        // denied in this harness, and what matters is the value the app hands
        // to the clipboard, not the clipboard itself.
        //
        // Installed after the screen has loaded rather than via
        // `addInitScript`: admin navigation is a hash change, so no new
        // document is created and an init script would never run.
        const installClipboardRecorder = () => page.evaluate(() => {
            (window as unknown as {__copied: string[]}).__copied = [];
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: (text: string) => {
                        (window as unknown as {__copied: string[]}).__copied.push(text);

                        return Promise.resolve();
                    }
                }
            });
        });

        await postFactory.create({title: 'Draft to preview', status: 'draft', featured: false});

        await postsPage.goto();
        await postsPage.waitForList();
        await installClipboardRecorder();
        await postsPage.openContextMenuFor('Draft to preview');
        await postsPage.contextMenuItem('Copy preview link').click();

        await expect(async () => {
            const copied = await page.evaluate(() => (window as unknown as {__copied: string[]}).__copied);

            expect(copied[0]).toContain('/p/');
            // ...and not the public permalink, which is what Ember copies here.
            expect(copied[0]).not.toContain('/draft-to-preview');
        }).toPass();
    });

    /**
     * **React offers Delete in the right-click menu; Ember does not.**
     *
     * Both gate it on the same rule — Ember's `session.user.isAdmin`, which is
     * Owner or Administrator, and React's `hasAdminAccess`, which is the same
     * pair. Yet probing Ember's menu as the **Owner** shows only Copy preview
     * link, Feature, Add a tag, Change access and Duplicate. No Delete.
     *
     * This is recorded rather than explained: the port matches Ember's stated
     * rule, so either Ember's own condition is not evaluating as its source
     * suggests, or something upstream of it differs in this environment. It
     * wants its own investigation — and until then, a delete-from-the-menu test
     * cannot be shared, because half of it has nothing to click.
     *
     * The React behaviour is the one users would expect, so it is asserted here
     * rather than removed.
     */
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
