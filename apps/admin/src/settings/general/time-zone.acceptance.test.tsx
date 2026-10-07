import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  currentRoute,
  fakeEditSettings,
  fakeSettingsScreens,
  renderAdminApp,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

describe('Time zone settings', () => {
  it('edits the time zone', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings');

    const select = settingsScreen.timezoneSelect();
    await expect.element(select).toBeVisible();
    await select.click();
    await settingsScreen.selectOption('Alaska').click();
    await settingsScreen.timezone().getByRole('button', { name: 'Save' }).click();

    await expect.element(select).toHaveTextContent('Alaska');
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'timezone', value: 'America/Anchorage' },
    ]);
  });

  it('closes the time zone options with Escape without closing Settings', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/settings');

    const select = settingsScreen.timezoneSelect();
    await select.click();
    await expect.element(settingsScreen.selectOption('Alaska')).toBeVisible();

    await userEvent.keyboard('{Escape}');

    await expect(settingsScreen.selectOption('Alaska')).toHaveCount(0);
    await expect.element(select).toBeVisible();
    await expect.poll(currentRoute).toBe('/settings');
  });
});
