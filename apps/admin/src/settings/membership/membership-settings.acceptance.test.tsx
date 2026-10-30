import { describe, expect, it } from 'vitest';

import { page } from 'vitest/browser';

import {
  configResponse,
  fakeSettingsScreens,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

describe('Membership settings', () => {
  it('shows the legacy welcome-email section and navigation when automations are off', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    await expect.element(settingsScreen.memberEmails()).toBeVisible();
    await expect.element(settingsScreen.navItem('Welcome emails')).toBeVisible();
  });

  it('hides the legacy welcome-email section and navigation when automations are on', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', {
      boot: {
        browseConfig: { response: configResponse({ labs: { automations: true } }) },
      },
    });

    await expect(settingsScreen.memberEmails()).toHaveCount(0);
    await expect(settingsScreen.navItem('Welcome emails')).toHaveCount(0);
  });

  it('shows gift subscriptions on sites that take payments', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    await expect.element(page.getByTestId('gift-subscriptions')).toBeVisible();
    await expect.element(settingsScreen.navItem('Gift subscriptions')).toBeVisible();
  });

  it('hides gift subscriptions on invite-only sites', async () => {
    fakeSettingsScreens();
    const settings = settingsResponse({ settings: { members_signup_access: 'invite' } });
    await renderAdminApp('/settings', { boot: { browseSettings: { response: settings } } });

    await expect.element(settingsScreen.portal()).toBeVisible();
    await expect(page.getByTestId('gift-subscriptions')).toHaveCount(0);
    await expect(settingsScreen.navItem('Gift subscriptions')).toHaveCount(0);
  });
});
