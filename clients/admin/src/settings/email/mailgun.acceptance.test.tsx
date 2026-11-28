import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { fakeEditSettings, fakeSettingsScreens, renderAdminApp } from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

describe('Mailgun settings', () => {
  it('saves the default region with the domain and private API key', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/newsletters');

    const section = settingsScreen.mailgun();
    await expect.element(section.getByText('Mailgun is not set up', { exact: true })).toBeVisible();
    await section.getByRole('button', { name: 'Edit' }).click();
    await expect.element(section.getByLabelText('Mailgun region')).toHaveTextContent('US');
    await section.getByLabelText('Mailgun domain').fill('test.com');
    await section.getByLabelText('Mailgun private API key').fill('test-key');
    await section.getByRole('button', { name: 'Save' }).click();

    await expect.element(section.getByText('Mailgun is set up', { exact: true })).toBeVisible();
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'mailgun_base_url', value: 'https://api.mailgun.net/v3' },
      { key: 'mailgun_domain', value: 'test.com' },
      { key: 'mailgun_api_key', value: 'test-key' },
    ]);
    expect(settingsApi.requests).toHaveLength(1);
  });

  it('saves a chosen region instead of the default', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings/newsletters');

    const section = settingsScreen.mailgun();
    await section.getByRole('button', { name: 'Edit' }).click();
    await section.getByLabelText('Mailgun region').click();
    await settingsScreen.selectOption('EU').click();
    await section.getByLabelText('Mailgun domain').fill('test.com');
    await section.getByLabelText('Mailgun private API key').fill('test-key');
    await section.getByRole('button', { name: 'Save' }).click();

    await expect.element(section.getByText('Mailgun is set up', { exact: true })).toBeVisible();
    await expect(settingsApi).toHaveEditedSettings([
      { key: 'mailgun_base_url', value: 'https://api.eu.mailgun.net/v3' },
      { key: 'mailgun_domain', value: 'test.com' },
      { key: 'mailgun_api_key', value: 'test-key' },
    ]);
    expect(settingsApi.requests).toHaveLength(1);
  });

  it('does not write the default region when another group is saved with the keyboard shortcut', async () => {
    fakeSettingsScreens();
    const settingsApi = fakeEditSettings();
    await renderAdminApp('/settings');

    await expect.element(settingsScreen.mailgun()).toBeVisible();
    const seoMeta = settingsScreen.seoMeta();
    await seoMeta.getByLabelText('Meta title').fill('Alternative title');
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect(settingsApi).toHaveEditedSettings([
      { key: 'meta_title', value: 'Alternative title' },
    ]);
    expect(settingsApi.requests).toHaveLength(1);
  });
});
