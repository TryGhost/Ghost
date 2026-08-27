import { describe, expect, it } from 'vitest';
import { canAccessSettingsRoute } from './settings-access';

type TestUser = Parameters<typeof canAccessSettingsRoute>[0];

function user(role: string, slug = 'jo'): TestUser {
  return { slug, roles: [{ name: role }] } as unknown as TestUser;
}

describe('canAccessSettingsRoute', () => {
  it('allows roles with settings access anywhere in settings', () => {
    expect(canAccessSettingsRoute(user('Administrator'), { pathname: '/settings/design' })).toBe(
      true,
    );
    expect(
      canAccessSettingsRoute(user('Editor'), { pathname: '/settings/staff/someone-else' }),
    ).toBe(true);
  });

  it('allows other roles on their own profile and its tabs', () => {
    expect(canAccessSettingsRoute(user('Contributor'), { pathname: '/settings/staff/jo' })).toBe(
      true,
    );
    expect(canAccessSettingsRoute(user('Author'), { pathname: '/settings/staff/jo/edit' })).toBe(
      true,
    );
    expect(
      canAccessSettingsRoute(user('Author'), { pathname: '/settings/staff/jo/social-links' }),
    ).toBe(true);
    expect(
      canAccessSettingsRoute(user('Author'), {
        pathname: '/settings/staff/jo/email-notifications',
      }),
    ).toBe(true);
  });

  it('denies other roles the rest of settings', () => {
    expect(canAccessSettingsRoute(user('Contributor'), { pathname: '/settings' })).toBe(false);
    expect(canAccessSettingsRoute(user('Contributor'), { pathname: '/settings/design' })).toBe(
      false,
    );
    expect(
      canAccessSettingsRoute(user('Author'), { pathname: '/settings/staff/someone-else' }),
    ).toBe(false);
    expect(canAccessSettingsRoute(user('Author'), { pathname: '/settings/staff/jo/history' })).toBe(
      false,
    );
  });
});
