import { AppsPage } from '@/admin-pages';
import { expect, signInAsStaff, test, withIsolatedPage } from '@/helpers/playwright';

const INSTALLATIONS_API = '/ghost/api/admin/apps/installations/';

test.describe('Ghost Admin - App access', () => {
  test.use({ fixtureAppEnabled: true });

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

    test('staff who can’t manage apps can’t install them', async ({
      page,
      browser,
      baseURL,
      fixtureApp,
      ghostAccountEditor,
    }) => {
      const ownerAppsPage = new AppsPage(page);
      await ownerAppsPage.gotoInstallLink(fixtureApp.manifestUrl);
      await expect(ownerAppsPage.installDialog.installButton).toBeVisible();

      await withIsolatedPage(browser, { baseURL }, async ({ page: editorPage }) => {
        await signInAsStaff(editorPage, ghostAccountEditor);

        const appsPage = new AppsPage(editorPage);
        await appsPage.gotoInstallLink(fixtureApp.manifestUrl);

        await expect(appsPage.notAllowedDialog).toBeVisible();
        await expect(appsPage.installDialog.modal).toHaveCount(0);
        expect((await editorPage.request.get(INSTALLATIONS_API)).status()).toBe(403);
      });
    });
  });
});
