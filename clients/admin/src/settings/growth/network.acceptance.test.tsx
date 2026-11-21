import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  configResponse,
  fakeEditSettings,
  fakeSettingsScreens,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

describe('Network settings', () => {
  it('disables the toggle when the feature is disabled by config', async () => {
    const config = configResponse();
    config.config.hostSettings = { limits: { limitSocialWeb: { disabled: true } } };
    fakeSettingsScreens();
    await renderAdminApp('/settings', { boot: { browseConfig: { response: config } } });

    const section = settingsScreen.network();
    const toggle = section.getByRole('switch');
    await expect.element(toggle).not.toBeChecked();
    await expect.element(toggle).toBeDisabled();
    await expect
      .element(
        section.getByText('You need to configure a supported custom domain to use this feature.'),
      )
      .toBeVisible();
  });

  it('disables the toggle when the site is private', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', {
      boot: {
        browseSettings: {
          response: settingsResponse({ settings: { social_web: true, is_private: true } }),
        },
      },
    });

    const section = settingsScreen.network();
    const toggle = section.getByRole('switch');
    await expect.element(toggle).not.toBeChecked();
    await expect.element(toggle).toBeDisabled();
    await expect
      .element(section.getByText(/Network is automatically disabled while your site is in/))
      .toBeVisible();
    await expect.element(section.getByText('private mode')).toBeVisible();
  });

  it('can be turned off', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', {
      boot: { browseSettings: { response: settingsResponse({ settings: { social_web: true } }) } },
    });

    const section = settingsScreen.network();
    const toggle = section.getByRole('switch');
    await expect.element(toggle).toBeChecked();
    await expect.element(toggle).toBeEnabled();
    await expect(
      section.getByText('You need to configure a supported custom domain to use this feature.'),
    ).toHaveCount(0);

    await toggle.click();
    await expect(settingsApi).toHaveEditedSettings([{ key: 'social_web', value: false }]);
  });

  it('can be turned on', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', {
      boot: { browseSettings: { response: settingsResponse({ settings: { social_web: false } }) } },
    });

    const section = settingsScreen.network();
    const toggle = section.getByRole('switch');
    await expect.element(toggle).not.toBeChecked();
    await expect.element(toggle).toBeEnabled();
    await expect(
      section.getByText('You need to configure a supported custom domain to use this feature.'),
    ).toHaveCount(0);

    await toggle.click();
    await expect(settingsApi).toHaveEditedSettings([{ key: 'social_web', value: true }]);
  });

  it('sets how new posts are shared', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', {
      boot: {
        browseSettings: {
          response: settingsResponse({
            settings: { social_web: true, default_social_web_share: 'article' },
          }),
        },
      },
    });

    const section = settingsScreen.network();
    const select = section.getByTestId('default-social-web-share-select');
    await expect.element(select).toHaveTextContent('Full article');

    await select.click();
    await page
      .getByRole('listbox')
      .getByRole('option', { name: 'Short note', exact: true })
      .click();

    await expect(settingsApi).toHaveEditedSettings([
      { key: 'default_social_web_share', value: 'note' },
    ]);
  });

  it('leaves out how new posts are shared while Network is off', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', {
      boot: {
        browseSettings: {
          response: settingsResponse({
            settings: { social_web: false, default_social_web_share: 'article' },
          }),
        },
      },
    });

    const section = settingsScreen.network();
    await expect.element(section.getByRole('switch')).not.toBeChecked();
    await expect(section.getByTestId('default-social-web-share-select')).toHaveCount(0);
  });

  it('leaves out how new posts are shared when the server does not support it', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings', {
      boot: { browseSettings: { response: settingsResponse({ settings: { social_web: true } }) } },
    });

    const section = settingsScreen.network();
    await expect.element(section.getByRole('switch')).toBeChecked();
    await expect(section.getByTestId('default-social-web-share-select')).toHaveCount(0);
  });
});
