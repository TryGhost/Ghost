import { describe, expect, it } from 'vitest';
import { assemblePublishInputs } from '@/editor/publish/use-publish-inputs';

function boundary(overrides: Record<string, unknown> = {}) {
  return {
    settingsData: {
      settings: [
        { key: 'members_signup_access', value: 'all' },
        { key: 'editor_default_email_recipients', value: 'filter' },
        { key: 'editor_default_email_recipients_filter', value: 'status:-free' },
        { key: 'timezone', value: 'Europe/Amsterdam' },
      ],
    },
    configData: { config: { mailgunIsConfigured: true } },
    newslettersData: {
      newsletters: [
        {
          slug: 'weekly',
          name: 'Weekly',
          status: 'active',
          visibility: 'members',
          sort_order: 2,
        },
      ],
    },
    currentUser: { roles: [{ name: 'Administrator' }] },
    memberCount: 12,
    ...overrides,
  };
}

describe('assemblePublishInputs', () => {
  it('validates and projects the API-backed publish inputs', () => {
    expect(assemblePublishInputs(boundary())).toEqual({
      site: {
        membersEnabled: true,
        mailgunConfigured: true,
        editorDefaultEmailRecipients: 'filter',
        editorDefaultEmailRecipientsFilter: 'status:-free',
        memberCount: 12,
        newsletters: [
          {
            slug: 'weekly',
            name: 'Weekly',
            status: 'active',
            visibility: 'members',
            sortOrder: 2,
          },
        ],
      },
      user: { isAdmin: true, isAuthorOrContributor: false },
      timezone: 'Europe/Amsterdam',
      isValid: true,
    });
  });

  it('fails closed on an unknown default-recipient setting', () => {
    const data = boundary();
    const settingsData = data.settingsData as { settings: Array<{ key: string; value: unknown }> };
    settingsData.settings[1].value = 'everybody';

    expect(assemblePublishInputs(data).isValid).toBe(false);
  });

  it('uses visibility when the default-recipient setting is absent', () => {
    const data = boundary();
    data.settingsData.settings = data.settingsData.settings.filter(
      (setting) => setting.key !== 'editor_default_email_recipients',
    );

    const assembled = assemblePublishInputs(data);
    expect(assembled.isValid).toBe(true);
    expect(assembled.site.editorDefaultEmailRecipients).toBe('visibility');
  });

  it.each([
    ['settings', { settingsData: { settings: 'invalid' } }],
    ['config', { configData: { config: { mailgunIsConfigured: 'yes' } } }],
    ['newsletters', { newslettersData: { newsletters: [{ slug: 'missing-fields' }] } }],
    ['current user', { currentUser: { roles: 'Administrator' } }],
    ['member count', { memberCount: '12' }],
  ])('fails closed for malformed %s data', (_name, override) => {
    expect(assemblePublishInputs(boundary(override)).isValid).toBe(false);
  });
});
