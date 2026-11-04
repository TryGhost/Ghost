import { AppDetailsPage, AppPage, AppsPage } from '@/admin-pages';
import { Page } from '@playwright/test';
import { expect, installApp, test } from '@/helpers/playwright';

/**
 * Opens the app's page again, which starts a new session and re-checks its manifest. The Apps list
 * renders in between, so the app's page closes rather than staying on its current session.
 */
async function reopenApp(page: Page, installationId: string) {
  const appsPage = new AppsPage(page);
  await appsPage.goto();
  await appsPage.rows.first().waitFor();
  await new AppPage(page).gotoApp(installationId);
}

test.describe('Ghost Admin - App manifest updates', () => {
  test.use({ labs: { apps: true } });

  test('applies a silent change when the app next opens', async ({ page, fixtureApp }) => {
    const appPage = new AppPage(page);
    const detailsPage = new AppDetailsPage(page);
    const installationId = await installApp(page, fixtureApp.manifestUrl);

    fixtureApp.updateManifest({ description: 'A newer description.' });
    await reopenApp(page, installationId);

    await expect(appPage.frame).toBeVisible();
    await detailsPage.gotoDetails(installationId);
    await expect(detailsPage.description('A newer description.')).toBeVisible();
    await expect(detailsPage.historyTitle(0)).toHaveText('Updated');
  });

  test('suspends the app for a change that needs approval, and approving resumes it on the new manifest', async ({
    page,
    fixtureApp,
  }) => {
    const appPage = new AppPage(page);
    const installationId = await installApp(page, fixtureApp.manifestUrl);

    fixtureApp.setPageUrl('app-v2.html');
    await reopenApp(page, installationId);

    await expect(appPage.needsApproval).toBeVisible();
    await expect(appPage.frame).toHaveCount(0);
    await expect(appPage.installDialog.modal).toContainText(
      `Review changes to ${fixtureApp.manifest.name}`,
    );
    await appPage.installDialog.approveChanges();

    await expect(appPage.frame).toBeVisible();
    await expect(appPage.app.servedFrom).toHaveText('/app-v2.html');
  });

  test('reverting a change before it is approved ends the suspension', async ({
    page,
    fixtureApp,
  }) => {
    const appPage = new AppPage(page);
    const detailsPage = new AppDetailsPage(page);
    const installationId = await installApp(page, fixtureApp.manifestUrl);

    fixtureApp.setPageUrl('app-v2.html');
    await reopenApp(page, installationId);
    await expect(appPage.needsApproval).toBeVisible();
    await appPage.installDialog.cancel();

    fixtureApp.setPageUrl('app.html');
    await reopenApp(page, installationId);

    await expect(appPage.frame).toBeVisible();
    await expect(appPage.app.servedFrom).toHaveText('/app.html');
    await detailsPage.gotoDetails(installationId);
    await expect(detailsPage.historyTitle(0)).toHaveText('Resumed, changes withdrawn');
  });

  test('refuses an update that changes the app’s ID and keeps the last valid manifest', async ({
    page,
    fixtureApp,
  }) => {
    const appPage = new AppPage(page);
    const detailsPage = new AppDetailsPage(page);
    const installationId = await installApp(page, fixtureApp.manifestUrl);
    const installed = fixtureApp.manifest;

    fixtureApp.updateManifest({ id: `${installed.id}-another`, description: 'Another app.' });
    await reopenApp(page, installationId);
    await expect(appPage.unavailable).toBeVisible();

    await detailsPage.gotoDetails(installationId);
    await expect(detailsPage.description(installed.description)).toBeVisible();

    fixtureApp.updateManifest({ id: installed.id, description: installed.description });
    await appPage.gotoApp(installationId);
    await expect(appPage.frame).toBeVisible();
  });

  test('an open app’s session ends when the installation changes, and Admin shows the review', async ({
    page,
    fixtureApp,
  }) => {
    const appPage = new AppPage(page);
    const installationId = await installApp(page, fixtureApp.manifestUrl);

    // Opening the app in another tab re-checks it, which suspends it for the new page URL.
    fixtureApp.setPageUrl('app-v2.html');
    const otherTab = await page.context().newPage();
    const otherAppPage = new AppPage(otherTab);
    await otherAppPage.gotoApp(installationId);
    await expect(otherAppPage.needsApproval).toBeVisible();
    await otherTab.close();

    await appPage.returnToTab();

    await expect(appPage.needsApproval).toBeVisible();
    await expect(appPage.installDialog.approveChangesButton).toBeVisible();
    await expect(appPage.frame).toHaveCount(0);
  });
});
