import {Page} from '@playwright/test';
import {PostsPage, RestorePage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

/**
 * Restore (crash recovery) screen tests, shared between the Ember
 * implementation (labs flag `restoreX` off) and the React implementation
 * (`restoreX` on).
 *
 * Revisions are seeded straight into localStorage using the schema shared by
 * both shells (key `post-revision-{id}-{timestamp}`, value = serialized post
 * data) — the suite tests the restore screen, not the editor that writes the
 * revisions.
 *
 * The implementations confirm a restore differently: Ember stays on /restore
 * and shows a success notification, React opens the new draft in the editor.
 */
const REVISION_LEXICAL = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Recovered content","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

async function seedRevision(page: Page, {id, title, excerpt}: {id: string; title: string; excerpt?: string}) {
    // both implementations restore the revision's authors by id, so seed a
    // real one (the API rejects post creation with an empty authors array)
    const response = await page.request.get('/ghost/api/admin/users/me/');
    const {users: [user]} = await response.json();

    const revisionTimestamp = Date.now();
    const revision = {
        id,
        type: 'post',
        revisionTimestamp,
        title,
        excerpt,
        lexical: REVISION_LEXICAL,
        slug: 'recovered-post',
        status: 'draft',
        authors: [{id: user.id}]
    };
    await page.evaluate(
        ([key, value]) => localStorage.setItem(key, value),
        [`post-revision-${id}-${revisionTimestamp}`, JSON.stringify(revision)] as const
    );
}

async function clearRevisions(page: Page) {
    await page.evaluate(() => {
        Object.keys(localStorage)
            .filter(key => key.startsWith('post-revision'))
            .forEach(key => localStorage.removeItem(key));
    });
}

export function defineRestoreTests({restoreOpensEditor}: {restoreOpensEditor: boolean}) {
    test.beforeEach(async ({page}) => {
        // localStorage is origin-scoped: park the shared authenticated page
        // on the admin origin before seeding/clearing revisions
        await page.goto('/ghost/');
        await clearRevisions(page);
    });

    test('shows an empty state when there are no local revisions', async ({page}) => {
        const restorePage = new RestorePage(page);

        await restorePage.goto();

        await expect(restorePage.emptyState).toBeVisible();
    });

    test('a locally saved revision is listed with its title and excerpt', async ({page}) => {
        await seedRevision(page, {id: 'e2e-listed', title: 'Crash recovery post', excerpt: 'Words that were lost'});
        const restorePage = new RestorePage(page);

        await restorePage.goto();

        await expect(restorePage.revisionTitle('Crash recovery post')).toBeVisible();
        await expect(page.getByText('Words that were lost')).toBeVisible();
        await expect(restorePage.revisionRow('Crash recovery post').getByRole('button', {name: 'Restore'})).toBeVisible();
    });

    test('restoring a revision creates a new draft', async ({page}) => {
        await seedRevision(page, {id: 'e2e-restored', title: 'Recovered post'});
        const restorePage = new RestorePage(page);
        await restorePage.goto();

        await restorePage.restoreRevision('Recovered post');

        if (restoreOpensEditor) {
            await page.waitForURL(/#\/editor\/post\//);
        } else {
            await expect(page.getByText('Post restored successfully')).toBeVisible();
        }

        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await expect(postsPage.getPostByTitle('(Restored) Recovered post')).toBeVisible();
    });
}
