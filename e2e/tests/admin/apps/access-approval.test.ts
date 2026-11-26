import { AppDetailsPage, AppPage, AppsPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';
import type { APIRequestContext, Page } from '@playwright/test';

const INSTALLATIONS_API = '/ghost/api/admin/apps/installations/';

interface StoredInstallation {
  id: string;
  status: string;
  manifest: { scopes: unknown };
}

/** The installation as Ghost stores it, read through the Admin API. */
async function storedInstallation(
  request: APIRequestContext,
  id: string,
): Promise<StoredInstallation> {
  const response = await request.get(`${INSTALLATIONS_API}${id}/`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { app_installations: StoredInstallation[] };
  return body.app_installations[0];
}

/** Opens the app's page again, which starts a new session and re-checks its manifest. */
async function reopenApp(page: Page, installationId: string) {
  const appsPage = new AppsPage(page);
  await appsPage.goto();
  await appsPage.rows.first().waitFor();
  await new AppPage(page).gotoApp(installationId);
}

test.describe('Ghost Admin - App access approval', () => {
  // Apps get tokens from Better Auth's OAuth provider, which is registered only when the flag
  // is on at boot, so they run in the Better Auth project only.
  test.skip(
    process.env.GHOST_E2E_AUTH_ENGINE !== 'better-auth',
    'Apps need auth:engine better-auth',
  );
  test.use({ labs: { apps: true }, config: { labs__apps: 'true' } });

  test('an Administrator approves the access an app declares, and a new scope suspends it until approved', async ({
    page,
    fixtureApp,
  }) => {
    const appsPage = new AppsPage(page);
    const appPage = new AppPage(page);
    const detailsPage = new AppDetailsPage(page);
    const { installDialog } = appsPage;

    fixtureApp.updateManifest({ scopes: ['post:browse'] });

    await appsPage.gotoInstallLink(fixtureApp.manifestUrl);
    await expect(installDialog.accessItems).toHaveCount(1);
    await expect(installDialog.accessItems).toContainText(
      'List, search and read every post and page, drafts included',
    );
    await installDialog.install();
    await expect(appPage.frame).toBeVisible();
    const installationId = appPage.installationId();

    // The app reaches only what it was approved for.
    await appPage.app.callAdminApi('/posts/');
    await expect(appPage.app.result).toHaveText(/^200 \{"posts":/);
    // Not how its posts performed, which Ghost includes by default but needs post:readStats. A
    // post's email is an object, or null, unlike an author's.
    await expect(appPage.app.result).not.toHaveText(/"email":(null|\{)|"count":\{/);
    // Ghost's server refuses a route no approved scope covers, and the app gets its answer.
    await appPage.app.callAdminApi('/tags/');
    await expect(appPage.app.result).toHaveText(/^403 \{"errors":\[\{"message":/);
    // A related object needs its own scope too, which Admin still checks before sending.
    await appPage.app.callAdminApi('/posts/?include=tags');
    await expect(appPage.app.result).toHaveText(
      "blocked: This app wasn't approved for tag:browse, which including tags needs",
    );

    expect(await storedInstallation(page.request, installationId)).toMatchObject({
      status: 'active',
      manifest: { scopes: ['post:browse'] },
    });

    fixtureApp.updateManifest({ scopes: ['post:edit', 'post:browse'] });
    await reopenApp(page, installationId);

    await expect(appPage.needsApproval).toBeVisible();
    await expect(appPage.frame).toHaveCount(0);
    await expect(appPage.installDialog.newAccess).toContainText(
      'Edit, publish and email posts and pages',
    );
    // Until it's approved, the installation stays suspended on what was approved before.
    expect(await storedInstallation(page.request, installationId)).toMatchObject({
      status: 'suspended',
      manifest: { scopes: ['post:browse'] },
    });
    await appPage.installDialog.cancel();
    await reopenApp(page, installationId);
    await expect(appPage.needsApproval).toBeVisible();
    await expect(appPage.frame).toHaveCount(0);

    await appPage.installDialog.approveChanges();

    await expect(appPage.frame).toBeVisible();
    expect(await storedInstallation(page.request, installationId)).toMatchObject({
      status: 'active',
      manifest: { scopes: ['post:browse', 'post:edit'] },
    });
    await detailsPage.gotoDetails(installationId);
    await expect(detailsPage.historyTitle(0)).toHaveText(/^Changes approved/);
    await detailsPage.openHistoryEntry(0);
    await expect(detailsPage.historyEntries.first()).toContainText(
      'Edit, publish and email posts and pages',
    );
  });
});
