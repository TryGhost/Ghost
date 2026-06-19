import {RestorePage, RestoreRevision} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import type {Page} from '@playwright/test';

const lexical = '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Test content","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

async function getOwnerId(page: Page): Promise<string> {
    const response = await page.request.get('/ghost/api/admin/users/me/?include=roles');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    return body.users[0].id;
}

function buildRevision(overrides: Partial<RestoreRevision> = {}): RestoreRevision {
    return {
        id: 'e2e-restore',
        type: 'post',
        status: 'draft',
        title: 'Test Post',
        excerpt: 'Test content',
        slug: 'e2e-restore-post',
        lexical,
        authors: [],
        tags: [],
        revisionTimestamp: Date.now(),
        ...overrides
    };
}

test.describe('Ghost Admin - Restore Posts', () => {
    test('seeded revision - shows title and restore button', async ({page}) => {
        const restorePage = new RestorePage(page);

        await restorePage.seedRevisionAndVisit(buildRevision());

        await expect(restorePage.postTitle).toHaveText('Test Post');
        await expect(restorePage.restoreButton).toBeVisible();
    });

    test('restore button clicked - shows success notification', async ({page}) => {
        const restorePage = new RestorePage(page);
        const ownerId = await getOwnerId(page);

        await restorePage.seedRevisionAndVisit(buildRevision({authors: [{id: ownerId}]}));
        await restorePage.restoreButton.click();

        // Restore creates the post via a real POST /posts/ round-trip, so the
        // success notification can take a few seconds to appear in dev mode.
        await expect(page.getByText('Post restored successfully')).toBeVisible({timeout: 20000});
    });

    test('no revisions - shows empty state', async ({page}) => {
        const restorePage = new RestorePage(page);

        await restorePage.visit();

        await expect(restorePage.emptyState).toBeVisible();
    });
});
