import { AppsPage, LoginPage, SidebarPage } from '@/admin-pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';

const INSTALLATIONS_API = '/ghost/api/admin/apps/installations/';

test.describe('Ghost Admin - App access', () => {
  test('Apps and its API are unavailable while the Labs flag is off', async ({
    page,
    fixtureApp,
  }) => {
    const appsPage = new AppsPage(page);

    await appsPage.gotoInstallLink(fixtureApp.manifestUrl);

    await expect(appsPage.notFound).toBeVisible();
    await expect(appsPage.installDialog.modal).toHaveCount(0);
    expect((await page.request.get(INSTALLATIONS_API)).status()).toBe(404);
  });

  test.describe('with the Labs flag on', () => {
    test.use({ labs: { apps: true } });

    const isBetterAuth = process.env.GHOST_E2E_AUTH_ENGINE === 'better-auth';

    test('an install link says apps need the new auth engine on a site without it', async ({
      page,
      fixtureApp,
    }) => {
      test.skip(isBetterAuth, 'Runs on the legacy engine');
      const appsPage = new AppsPage(page);

      await appsPage.gotoInstallLink(fixtureApp.manifestUrl);

      await expect(appsPage.needsNewAuthEngine).toBeVisible();
      await expect(appsPage.installDialog.modal).toHaveCount(0);
    });

    test('staff who can’t manage apps can’t install them', async ({
      page,
      browser,
      baseURL,
      fixtureApp,
      ghostAccountEditor,
    }) => {
      // Ghost offers install only on the auth engine that issues apps their tokens
      test.skip(!isBetterAuth, 'Apps need auth:engine better-auth');
      const ownerAppsPage = new AppsPage(page);
      await ownerAppsPage.gotoInstallLink(fixtureApp.manifestUrl);
      await expect(ownerAppsPage.installDialog.installButton).toBeVisible();

      await withIsolatedPage(browser, { baseURL }, async ({ page: editorPage }) => {
        const loginPage = new LoginPage(editorPage);
        await loginPage.goto();
        await loginPage.signIn(ghostAccountEditor.email, ghostAccountEditor.password);
        await expect(new SidebarPage(editorPage).sidebar).toBeVisible();

        const appsPage = new AppsPage(editorPage);
        await appsPage.gotoInstallLink(fixtureApp.manifestUrl);

        await expect(appsPage.notAllowedDialog).toBeVisible();
        await expect(appsPage.installDialog.modal).toHaveCount(0);
        expect((await editorPage.request.get(INSTALLATIONS_API)).status()).toBe(403);
      });
    });
  });
});
