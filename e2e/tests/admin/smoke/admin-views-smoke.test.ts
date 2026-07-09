import {
    ActivityPubPage,
    AnalyticsOverviewPage,
    AnalyticsWebTrafficPage,
    CommentsPage,
    MembersListPage,
    PostEditorPage,
    PostsPage,
    SettingsPage,
    TagsPage
} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright/console-errors';

/**
 * Runtime acceptance gate.
 *
 * The build-mode e2e suite boots the real production admin bundle, but a view can
 * still throw at runtime while a navigation-only test stays green. Each smoke test
 * here navigates to a major admin view against the real build, waits for a key
 * content locator (proving the view actually rendered — not just that the route
 * resolved), and then asserts ZERO non-allowlisted console.error / pageerror events
 * were captured. That second assertion is what turns a silent runtime throw red.
 *
 * The `runtimeErrors` fixture attaches its listeners before the test body runs, so
 * everything the navigation triggers is covered.
 *
 * NEGATIVE CONTROL: to prove the gate catches the class of bug it targets, break a
 * component that one of these views renders (e.g. throw inside a stats card, or
 * reference an undefined symbol so the bundle throws on mount). The key-content
 * `waitFor` may still pass for shell-level chrome, but the view's own render throws
 * a `pageerror` / logs a React `console.error`, `runtimeErrors` is non-empty, and
 * the `toHaveLength(0)` assertion fails with the captured stack printed. The skipped
 * `negative control` test at the bottom documents this without shipping a real break.
 */

// Analytics/stats views fetch from Tinybird; without it they surface fetch errors
// that are environmental, not bundle bugs. CI enables it via GHOST_E2E_ANALYTICS.
const analyticsEnabled = process.env.GHOST_E2E_ANALYTICS === 'true';

test.describe('Ghost Admin - Runtime smoke gate', () => {
    test('posts list renders without runtime errors', async ({page, runtimeErrors}) => {
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPageToFullyLoad();

        await expect(postsPage.postsList).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('post editor renders without runtime errors', async ({page, runtimeErrors}) => {
        const editorPage = new PostEditorPage(page);
        await editorPage.goto();
        await editorPage.titleInput.waitFor({state: 'visible'});

        await expect(editorPage.titleInput).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('tags list renders without runtime errors', async ({page, runtimeErrors}) => {
        const tagsPage = new TagsPage(page);
        await tagsPage.goto();
        await tagsPage.waitForPageToFullyLoad();

        await expect(tagsPage.pageContent).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('members list renders without runtime errors', async ({page, runtimeErrors}) => {
        // Seed a member so the list view renders real content rather than the empty
        // state, exercising the row-rendering path where a runtime error would hide.
        await createMemberFactory(page.request).create({name: 'Smoke Member', email: 'smoke-member@example.com'});

        const membersListPage = new MembersListPage(page);
        await membersListPage.goto();
        await membersListPage.memberRows.first().waitFor({state: 'visible'});

        await expect(membersListPage.memberRows.first()).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('comments list renders without runtime errors', async ({page, runtimeErrors}) => {
        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        await expect(commentsPage.commentsList).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('settings general section renders without runtime errors', async ({page, runtimeErrors}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        await expect(settingsPage.sidebar).toBeVisible();
        await expect(settingsPage.publicationSection.languageSection).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('settings staff section renders without runtime errors', async ({page, runtimeErrors}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.staffSidebarLink.click();

        await expect(settingsPage.staffSection.ownerUser).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('activitypub network view renders without runtime errors', async ({page, runtimeErrors}) => {
        const activityPubPage = new ActivityPubPage(page);
        await activityPubPage.goto();
        await activityPubPage.waitForAppToMount();

        await expect(activityPubPage.readerNavLink).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('analytics overview renders without runtime errors', async ({page, runtimeErrors}) => {
        test.skip(!analyticsEnabled, 'Requires Tinybird (GHOST_E2E_ANALYTICS=true)');

        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await analyticsOverviewPage.header.waitFor({state: 'visible'});

        await expect(analyticsOverviewPage.header).toBeVisible();
        await expect(analyticsOverviewPage.topPosts.post).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    test('analytics web traffic (stats dashboard) renders without runtime errors', async ({page, runtimeErrors}) => {
        test.skip(!analyticsEnabled, 'Requires Tinybird (GHOST_E2E_ANALYTICS=true)');

        const analyticsWebTrafficPage = new AnalyticsWebTrafficPage(page);
        await analyticsWebTrafficPage.goto();
        await analyticsWebTrafficPage.topContentCard.waitFor({state: 'visible'});

        await expect(analyticsWebTrafficPage.topContentCard).toBeVisible();
        expect(runtimeErrors).toHaveLength(0);
    });

    // NEGATIVE CONTROL (documentation-only; intentionally skipped).
    //
    // Proves the gate catches a runtime throw that a navigation-only test misses.
    // To run it for real: unskip, then temporarily break a view the smoke suite
    // renders — e.g. in apps/stats add `throw new Error('boom')` at the top of the
    // Overview component's render, or reference an undefined global. Rebuild the
    // e2e image and run this project. Expected result: the shell may still mount,
    // but the broken view emits a pageerror / React console.error, `runtimeErrors`
    // is non-empty, and `toHaveLength(0)` fails with the captured stack. Revert the
    // break and re-run: green. That red→green swing is the proof the gate works.
    test.skip('negative control - a broken view turns the gate red', async ({page, runtimeErrors}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await analyticsOverviewPage.header.waitFor({state: 'visible'});

        expect(runtimeErrors).toHaveLength(0);
    });
});
