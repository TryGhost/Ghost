import { describe, expect, it } from 'vitest';
import { connectedStripeSettings } from '@tryghost/test-data';
import { createAdminState } from '@test-utils/acceptance/state';

describe('Admin scenario state', () => {
  it('preserves seeded settings, omissions, and earlier writes', () => {
    const state = createAdminState({
      labs: { machinePayments: true },
      settings: connectedStripeSettings(),
      omitSettings: ['machine_payments_enabled'],
    });
    state.editSettings([{ key: 'title', value: 'First edit' }]);
    state.editSettings([
      { key: 'description', value: 'Second edit' },
      { key: 'logo', value: null },
    ]);

    const values = Object.fromEntries(
      state.readSettings().settings.map(({ key, value }) => [key, value]),
    );
    expect(values).toMatchObject({
      ...connectedStripeSettings(),
      title: 'First edit',
      description: 'Second edit',
      logo: null,
    });
    expect(values).not.toHaveProperty('machine_payments_enabled');
    expect(JSON.parse(String(values.labs))).toMatchObject({ machinePayments: true });
    expect(state.readConfig().config.labs).toMatchObject({ machinePayments: true });
  });

  it('updates config when the settings labs value changes and rejects malformed labs atomically', () => {
    const state = createAdminState({ labs: { automations: true } });
    state.editSettings([{ key: 'labs', value: JSON.stringify({ automations: false }) }]);
    expect(state.readConfig().config.labs).toEqual({ automations: false });
    const before = state.readSettings();
    expect(() =>
      state.editSettings([
        { key: 'title', value: 'Must not save' },
        { key: 'labs', value: '[' },
      ]),
    ).toThrow();
    expect(state.readSettings()).toEqual(before);
  });

  it('merges named limits without losing other host settings and isolates caller data', () => {
    const options = {
      config: {
        hostSettings: { billing: { enabled: true, url: '/billing' } },
        stats: { id: 'site', endpoint: 'https://tinybird.test' },
      },
      limits: { customThemes: { allowlist: ['casper'] }, staff: { max: 3 } },
    };
    const state = createAdminState(options);
    options.limits.customThemes.allowlist.push('source');
    options.config.hostSettings.billing.url = '/changed';
    expect(state.readConfig().config).toMatchObject({
      hostSettings: {
        billing: { enabled: true, url: '/billing' },
        limits: { customThemes: { allowlist: ['casper'] }, staff: { max: 3 } },
      },
      stats: { id: 'site', endpoint: 'https://tinybird.test' },
    });
  });

  it('retains role and identity through preference edits without leaking snapshots', () => {
    const state = createAdminState({
      user: {
        id: 'editor-id',
        roles: ['Editor'],
        accessibility: { whatsNew: { lastSeenDate: '2026-01-01' } },
      },
    });
    const before = state.readUser();
    expect(JSON.parse(String(before.users[0].accessibility))).toEqual({
      whatsNew: { lastSeenDate: '2026-01-01' },
    });
    state.editUser({ id: 'another-user', accessibility: JSON.stringify({ darkMode: true }) });
    state.editUser({ name: 'Updated name' });
    const after = state.readUser();
    expect(after.users[0]).toMatchObject({
      id: 'editor-id',
      name: 'Updated name',
      roles: [{ name: 'Editor' }],
      accessibility: '{"darkMode":true}',
    });
    after.users[0].name = 'Mutated response';
    expect(state.readUser().users[0].name).toBe('Updated name');
    expect(before.users[0].name).toBe('Owner User');
    expect(createAdminState().readUser().users[0]).toMatchObject({ id: '1', name: 'Owner User' });
  });

  it.each([
    [{ settings: { labs: '{}' } }, 'settings.labs'],
    [{ omitSettings: ['labs'] }, 'omitSettings'],
    [
      { settings: { title: 'Conflict' }, omitSettings: ['title'] },
      'both settings and omitSettings',
    ],
    [
      {
        config: { hostSettings: { limits: { staff: { max: 1 } } } },
        limits: { staff: { max: 2 } },
      },
      'not both',
    ],
  ] as const)('rejects ambiguous seed inputs: %j', (options, message) => {
    expect(() => createAdminState(options)).toThrow(message);
  });
});
