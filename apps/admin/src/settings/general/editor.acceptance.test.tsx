import { describe, expect, it } from 'vitest';

import {
  fakeEditSettings,
  fakeSettingsScreens,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

describe('Editor settings', () => {
  it('can turn smart quotes off', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', {
      boot: {
        browseSettings: { response: settingsResponse({ settings: { editor_smart_quotes: true } }) },
      },
    });

    const section = settingsScreen.editor();
    const toggle = section.getByRole('switch', { name: 'Smart quotes' });
    await expect.element(toggle).toBeChecked();

    await toggle.click();
    await expect(settingsApi).toHaveEditedSettings([{ key: 'editor_smart_quotes', value: false }]);
  });

  it('can turn smart quotes on', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings', {
      boot: {
        browseSettings: {
          response: settingsResponse({ settings: { editor_smart_quotes: false } }),
        },
      },
    });

    const section = settingsScreen.editor();
    const toggle = section.getByRole('switch', { name: 'Smart quotes' });
    await expect.element(toggle).not.toBeChecked();

    await toggle.click();
    await expect(settingsApi).toHaveEditedSettings([{ key: 'editor_smart_quotes', value: true }]);
  });
});
