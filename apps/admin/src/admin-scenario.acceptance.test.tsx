import { describe, expect, it } from 'vitest';
import { configureAdminScenario } from '@test-utils/acceptance/boot';
import {
  connectedStripeSettings,
  currentUserResponse,
  fakeEditSettings,
  fakeSettingsScreens,
  renderAdminApp,
  settingsResponse,
  type SettingsResponse,
  type CurrentUserResponse,
} from '@test-utils/acceptance';
import { verifyNoUnhandledRequests } from '@test-utils/acceptance/worker';
import { settingsScreen } from '@/settings/settings.screen';

const settingsPath = '/settings/?group=site,labs';
async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(
    `/ghost/api/admin${path}`,
    body === undefined
      ? {}
      : {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  return (await response.json()) as T;
}
const valuesOf = (body: SettingsResponse) =>
  Object.fromEntries(body.settings.map(({ key, value }) => [key, value]));

describe('Admin scenario API', () => {
  it('serves settings/config together and retains settings through successive PUTs and refetches', async () => {
    const capture = fakeEditSettings();
    configureAdminScenario({
      settings: connectedStripeSettings(),
      labs: { machinePayments: true },
      omitSettings: ['machine_payments_enabled'],
      config: { stats: { id: 'analytics-site' } },
      limits: { staff: { max: 4 } },
    });
    await api(settingsPath.replace('?group=site,labs', ''), {
      settings: [{ key: 'title', value: 'Edited' }],
    });
    await api('/settings/', { settings: [{ key: 'description', value: 'Second save' }] });
    const settings = valuesOf(await api<SettingsResponse>(settingsPath));
    expect(settings).toMatchObject({
      ...connectedStripeSettings(),
      title: 'Edited',
      description: 'Second save',
    });
    expect(settings).not.toHaveProperty('machine_payments_enabled');
    expect(JSON.parse(String(settings.labs))).toMatchObject({ machinePayments: true });
    expect(await api('/config/')).toMatchObject({
      config: {
        stats: { id: 'analytics-site' },
        labs: { machinePayments: true },
        hostSettings: { limits: { staff: { max: 4 } } },
      },
    });
    expect(capture.requests).toHaveLength(2);
  });

  it('keeps the seeded current user after a write and refuses writes to another user', async () => {
    configureAdminScenario({ user: { id: 'editor-id', roles: ['Editor'] } });
    await api('/users/editor-id/?include=roles', {
      users: [{ id: 'wrong-id', accessibility: '{"darkMode":true}' }],
    });
    expect(await api('/users/me/?include=roles')).toMatchObject({
      users: [{ id: 'editor-id', roles: [{ name: 'Editor' }], accessibility: '{"darkMode":true}' }],
    });
    const response = await fetch('/ghost/api/admin/users/other/?include=roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: [{ name: 'Another user' }] }),
    });
    expect(response.status).toBe(418);
    expect(() => verifyNoUnhandledRequests()).toThrow('/users/other/');
    expect(await api('/users/me/?include=roles')).toMatchObject({
      users: [{ id: 'editor-id', name: 'Owner User' }],
    });
  });

  it.each([false, true])(
    'does not commit a failed preference write (raw response: %s)',
    async (raw) => {
      configureAdminScenario({
        user: { roles: ['Editor'] },
        boot: {
          editUserPreferences: {
            responseStatus: 422,
            ...(raw ? { response: { errors: [{ message: 'Save failed' }] } } : {}),
          },
        },
      });
      const response = await fetch('/ghost/api/admin/users/1/?include=roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [{ name: 'Must not save' }] }),
      });
      expect(response.status).toBe(422);
      expect(await api('/users/me/?include=roles')).toMatchObject({
        users: [{ name: 'Owner User', roles: [{ name: 'Editor' }] }],
      });
    },
  );

  it('preserves raw settings callbacks and their legacy echo behavior', async () => {
    fakeEditSettings();
    const raw = settingsResponse({ settings: { title: 'Raw settings' } });
    configureAdminScenario({
      labs: { automations: true },
      boot: { browseSettings: { response: () => Promise.resolve(raw) } },
    });
    const initial = valuesOf(await api<SettingsResponse>(settingsPath));
    expect(initial.title).toBe('Raw settings');
    expect(JSON.parse(String(initial.labs))).toMatchObject({ automations: true });
    const saved = valuesOf(
      await api<SettingsResponse>('/settings/', {
        settings: [{ key: 'description', value: 'Edited' }],
      }),
    );
    expect(saved.title).toBe('Test Site');
    expect(valuesOf(await api<SettingsResponse>(settingsPath)).title).toBe('Raw settings');
    expect(valuesOf(raw).title).toBe('Raw settings');
  });

  it('keeps a raw current-user read outside managed state', async () => {
    const raw = currentUserResponse();
    raw.users[0].id = 'legacy-user';
    configureAdminScenario({ boot: { browseMe: { response: raw } } });
    const saved = await api<CurrentUserResponse>('/users/legacy-user/?include=roles', {
      users: [{ name: 'Legacy edit' }],
    });
    expect(saved.users[0].name).toBe('Legacy edit');
    expect(await api('/users/me/?include=roles')).toEqual(raw);
  });

  it('keeps successful raw staff writes out of managed current-user state', async () => {
    const saved = currentUserResponse();
    saved.users[0].id = 'another-user';
    saved.users[0].name = 'Another user';
    configureAdminScenario({
      user: { roles: ['Editor'] },
      boot: { editUserPreferences: { response: saved } },
    });
    expect(
      await api('/users/another-user/?include=roles', { users: [{ name: 'Another user' }] }),
    ).toEqual(saved);
    expect(await api('/users/me/?include=roles')).toMatchObject({
      users: [{ id: '1', name: 'Owner User', roles: [{ name: 'Editor' }] }],
    });
  });

  it('rejects competing read seeds but accepts status-only overrides', async () => {
    expect(() =>
      configureAdminScenario({
        settings: {},
        boot: { browseSettings: { response: { settings: [] } } },
      }),
    ).toThrow('browseSettings.response');
    expect(() =>
      configureAdminScenario({ config: {}, boot: { browseConfig: { response: { config: {} } } } }),
    ).toThrow('browseConfig.response');
    expect(() =>
      configureAdminScenario({ user: {}, boot: { browseMe: { response: { users: [] } } } }),
    ).toThrow('browseMe.response');
    configureAdminScenario({
      settings: { title: 'Seeded' },
      boot: { browseSettings: { responseStatus: 200, response: undefined } },
    });
    expect(valuesOf(await api<SettingsResponse>(settingsPath)).title).toBe('Seeded');
  });

  it('preserves the scenario after saving through the actual settings UI', async () => {
    fakeSettingsScreens();
    const capture = fakeEditSettings();
    await renderAdminApp('/settings', {
      settings: connectedStripeSettings(),
      labs: { machinePayments: true },
      omitSettings: ['machine_payments_enabled'],
    });
    const section = settingsScreen.titleAndDescription();
    await section.getByRole('button', { name: 'Edit' }).click();
    await section.getByLabelText('Site title').fill('Updated publication');
    await section.getByRole('button', { name: 'Save' }).click();
    await expect.element(section.getByText('Updated publication', { exact: true })).toBeVisible();
    const saved = valuesOf(await api<SettingsResponse>(settingsPath));
    expect(saved).toMatchObject({ ...connectedStripeSettings(), title: 'Updated publication' });
    expect(saved).not.toHaveProperty('machine_payments_enabled');
    expect(capture.requests).toHaveLength(1);
  });
});
