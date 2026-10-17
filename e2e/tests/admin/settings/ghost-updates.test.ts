import { AboutPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - Ghost updates', () => {
  test.describe('on a host that updates Ghost', () => {
    test.use({ upgradeHostEnabled: true });

    test.beforeEach(({ upgradeHost }) => {
      // Held at each stage, so every stage can be seen before the next.
      upgradeHost!.configure({
        currentVersion: '6.71.0',
        targetVersion: '6.72.0',
        stageMs: null,
        activePollMs: 1000,
      });
    });

    test('shows the updates and follows a one-click update to its new version', async ({
      page,
      upgradeHost,
    }) => {
      const host = upgradeHost!;
      const aboutPage = new AboutPage(page);
      await aboutPage.goto();

      await expect(aboutPage.oneClickUpdate('ghost 6.71.0 → 6.72.0')).toBeVisible();
      await expect(aboutPage.manualUpdates).toContainText('stack v1.4.0 → v1.5.0');
      await expect(aboutPage.manualUpdates.getByRole('code')).toHaveText(
        './ghost-docker self-update',
      );

      await aboutPage.oneClickUpdate('ghost 6.71.0 → 6.72.0').getByRole('button').click();
      await expect(aboutPage.confirmUpdate).toContainText('Your site is backed up first');
      await aboutPage.updateNowButton.click();

      await expect(aboutPage.job).toContainText('Waiting for the update to start');
      expect(host.requests).toEqual([
        expect.objectContaining({ component: 'ghost', toVersion: '6.72.0' }),
      ]);

      for (const title of [
        'Downloading the new version',
        'Backing up your site',
        'Restarting Ghost',
        'Checking the new version',
      ]) {
        host.advance();
        await expect(aboutPage.job).toContainText(title);
      }

      host.advance();
      await expect(aboutPage.job).toContainText('Updated to 6.72.0');
      await expect(aboutPage.reloadAdminButton).toBeVisible();
      // The site is on the new version, so the host no longer offers it.
      await expect(aboutPage.oneClickUpdates).toHaveCount(0);
    });

    test('reports an update that needs attention', async ({ page, upgradeHost }) => {
      const host = upgradeHost!;
      host.configure({ outcome: 'needs-operator' });
      const aboutPage = new AboutPage(page);
      await aboutPage.goto();

      await aboutPage.requestUpdate('ghost 6.71.0 → 6.72.0');
      await expect(aboutPage.job).toContainText('Waiting for the update to start');

      host.finish();
      await expect(aboutPage.job).toContainText('The update needs attention');
      await expect(aboutPage.job).toContainText('The automatic restore did not finish.');
      await expect(aboutPage.reloadAdminButton).toBeHidden();
      // Nothing changed, so the update is offered again.
      await expect(aboutPage.oneClickUpdate('ghost 6.71.0 → 6.72.0')).toBeVisible();
    });

    test('shows why updates are unavailable', async ({ page, upgradeHost }) => {
      upgradeHost!.configure({ availability: 'unavailable' });
      const aboutPage = new AboutPage(page);
      await aboutPage.goto();

      await expect(aboutPage.availabilityNotice).toContainText(
        'Updates are temporarily unavailable',
      );
      await expect(aboutPage.availabilityNotice).toContainText('An earlier update did not finish.');
      await expect(
        aboutPage.oneClickUpdate('ghost 6.71.0 → 6.72.0').getByRole('button'),
      ).toBeDisabled();
    });
  });

  test('shows no updates panel when Ghost has no upgrade adapter', async ({ page }) => {
    const aboutPage = new AboutPage(page);
    await aboutPage.goto();

    await expect(aboutPage.updates).toHaveCount(0);
  });
});
