import { AppDetailsPage, AppPage, AppsPage } from '@/admin-pages';
import { FixtureApp } from '@/helpers/services/apps';
import { Request } from '@playwright/test';
import { expect, installApp, signInAsStaff, test, withIsolatedPage } from '@/helpers/playwright';

/** The app's call that's still running when its session ends, told apart from Admin's own requests. */
const HELD_CALL_FILTER = 'slug:e2e-held-call';
const HELD_CALL_PATH = `/posts/?filter=${HELD_CALL_FILTER}`;
const isHeldCall = (request: Request | URL) => {
  const url = request instanceof URL ? request : new URL(request.url());
  return (
    url.pathname === '/ghost/api/admin/posts/' &&
    url.searchParams.get('filter') === HELD_CALL_FILTER
  );
};

test.describe('Ghost Admin - App install lifecycle', () => {
  test.use({ labs: { apps: true } });

  test('installs an app that opens and calls the Admin API', async ({ page, fixtureApp }) => {
    const appsPage = new AppsPage(page);
    const appPage = new AppPage(page);

    await appsPage.gotoInstallLink(fixtureApp.manifestUrl);
    await expect(appsPage.installDialog.modal).toContainText(fixtureApp.manifest.name);
    await appsPage.installDialog.install();

    await expect(appPage.frame).toBeVisible();
    await expect(appPage.appPagePath).toHaveText('/app.html');
    const result = await appPage.bridgeFetch({ path: '/posts/' });
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body ?? '')).toHaveProperty('posts');
  });

  test('refuses app requests to endpoints apps can’t use', async ({ page, fixtureApp }) => {
    const appPage = new AppPage(page);
    await installApp(page, fixtureApp.manifestUrl);
    const sent: string[] = [];
    page.on('request', (request) => sent.push(new URL(request.url()).pathname));

    expect(await appPage.bridgeFetch({ path: '/db/' })).toEqual({
      error: "blocked: Apps can't use GET /db/",
    });
    expect(await appPage.bridgeFetch({ path: '/users/me/token/' })).toEqual({
      error: "blocked: Apps can't use GET /users/me/token/",
    });
    // Admin refuses them before sending anything.
    expect(sent).not.toContain('/ghost/api/admin/db/');
    expect(sent).not.toContain('/ghost/api/admin/users/me/token/');
  });

  test('an uninstall from another Admin session ends the open app’s session, and reinstalling starts a new installation', async ({
    page,
    browser,
    baseURL,
    fixtureApp,
    ghostAccountAdministrator,
  }) => {
    const appPage = new AppPage(page);
    const detailsPage = new AppDetailsPage(page);
    const installationId = await installApp(page, fixtureApp.manifestUrl);
    const oldFrame = await appPage.appFrame();

    // The app's call is still running when the session ends: its request is held, never answered.
    await page.route(isHeldCall, () => {});
    const held = page.waitForRequest(isHeldCall);
    const aborted = page.waitForEvent('requestfailed', isHeldCall);
    await appPage.startBridgeFetch({ path: HELD_CALL_PATH }, oldFrame);
    await held;

    await withIsolatedPage(browser, { baseURL }, async ({ page: otherPage }) => {
      await signInAsStaff(otherPage, ghostAccountAdministrator);

      const otherDetailsPage = new AppDetailsPage(otherPage);
      await otherDetailsPage.gotoDetails(installationId);
      await otherDetailsPage.uninstall();
    });

    // Admin sees the change when the publisher comes back to the tab, and ends the session: the
    // app's running call is cancelled and its frame removed.
    await appPage.returnToTab();
    await aborted;
    await expect(appPage.notInstalled).toBeVisible();
    await expect.poll(() => oldFrame.isDetached()).toBe(true);
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    const reinstalledId = await installApp(page, fixtureApp.manifestUrl);
    expect(reinstalledId).not.toBe(installationId);
    expect(await appPage.sessionRevision()).toBe(0);

    await appPage.gotoApp(installationId);
    await expect(appPage.notInstalled).toBeVisible();
    await detailsPage.gotoDetails(installationId);
    await expect(detailsPage.details).toContainText('Uninstalled');
    await detailsPage.gotoDetails(reinstalledId);
    await expect(detailsPage.historyEntries).toHaveCount(1);
    await expect(detailsPage.historyEntries).toContainText('Installed');
  });

  test('installs the app as it is now when it changed during the review', async ({
    page,
    fixtureApp,
  }) => {
    const appsPage = new AppsPage(page);
    const appPage = new AppPage(page);
    const { installDialog } = appsPage;

    await appsPage.gotoInstallLink(fixtureApp.manifestUrl);
    await expect(installDialog.installButton).toBeVisible();
    fixtureApp.updateManifest({ description: 'Changed during the review.' });

    const confirmed = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/ghost/api/admin/apps/installations/',
    );
    await installDialog.installButton.click();
    expect((await confirmed).status()).toBe(409);
    await expect(installDialog.notice).toBeVisible();
    await expect(installDialog.modal).toContainText('Changed during the review.');

    await installDialog.install();
    await expect(appPage.frame).toBeVisible();
  });

  test('moving an app through its install link updates the existing installation', async ({
    page,
    fixtureApp,
  }) => {
    const appsPage = new AppsPage(page);
    const appPage = new AppPage(page);
    const detailsPage = new AppDetailsPage(page);
    const installationId = await installApp(page, fixtureApp.manifestUrl);
    // The same app, now served from another host.
    const movedApp = new FixtureApp({ appId: fixtureApp.manifest.id });
    await movedApp.start();

    try {
      await appsPage.gotoInstallLink(movedApp.manifestUrl);
      await expect(appsPage.installDialog.moveWarning).toBeVisible();
      await appsPage.installDialog.approveChanges();

      await appPage.gotoApp(installationId);
      await expect(appPage.frame).toBeVisible();
      await expect(appPage.frame).toHaveAttribute('src', `${movedApp.origin}/app.html`);
      await detailsPage.gotoDetails(installationId);
      await expect(detailsPage.historyEntries.first()).toContainText(
        `Moved to ${new URL(movedApp.origin).host}`,
      );
    } finally {
      await movedApp.stop();
    }
  });
});
