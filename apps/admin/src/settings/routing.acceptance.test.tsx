import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { currentRoute, fakeSettingsScreens, renderAdminApp } from '@test-utils/acceptance';
import { settingsScreen } from './settings.screen';

describe('Settings routing', () => {
  it('surfaces the route error boundary when a settings query fails', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', {
      boot: {
        browseSettings: {
          response: { errors: [{ message: 'Settings exploded' }] },
          responseStatus: 500,
        },
      },
    });

    // The suspense read throws to the route error boundary; no blank screen
    await expect.element(page.getByRole('heading', { name: 'Loading interrupted' })).toBeVisible();
  });

  it('opens a modal from a direct route', async () => {
    fakeSettingsScreens();

    await renderAdminApp('/settings/portal/edit');

    await expect.element(settingsScreen.portalModal()).toBeVisible();
    await expect.poll(currentRoute).toBe('/settings/portal/edit');
  });

  it('updates the route when opening a modal from a settings group', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    await settingsScreen.portal().getByRole('button', { name: 'Customize' }).click();

    await expect.element(settingsScreen.portalModal()).toBeVisible();
    await expect.poll(currentRoute).toBe('/settings/portal/edit');
  });

  it('redirects the retired lock-site route to access settings', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings/locksite');

    await expect.poll(currentRoute).toBe('/settings/members');
  });
});
