import { AppPage, AppsPage } from '@/admin-pages';
import { Page } from '@playwright/test';

/**
 * Installs an app through its install link and waits for its page to start, as a publisher would.
 * Returns the new installation's ID.
 */
export async function installApp(page: Page, manifestUrl: string): Promise<string> {
  const appsPage = new AppsPage(page);
  await appsPage.gotoInstallLink(manifestUrl);
  await appsPage.installDialog.install();

  const appPage = new AppPage(page);
  await appPage.frame.waitFor({ state: 'visible' });
  return appPage.installationId();
}
