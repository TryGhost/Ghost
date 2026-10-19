import { beforeEach, describe, expect, it } from 'vitest';

import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeTags,
  fakeAdminEndpoint,
  fakePosts,
  fakePostsListScreen,
  renderAdminApp,
  staffRole,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import type { StaffRoleName } from '@tryghost/test-data';
import { migrateScreen } from '@/migrate/migrate.screen';

function asRole(name: StaffRoleName): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { boot: { browseMe: { response: me } } };
}

// Denied routes redirect home, which sends the role on to its landing route.
const landingRoute = (role: StaffRoleName) => (role === 'Contributor' ? '/posts' : '/site');

const OWNER_SLUG = currentUserResponse().users[0].slug as string;

describe('Route access', () => {
  // Contributors land on the posts list once a denied route sends them home.
  beforeEach(() => {
    fakePostsListScreen();
    fakePosts([]);
  });

  it('redirects a contributor away from settings', async () => {
    await renderAdminApp('/settings/design', asRole('Contributor'));

    await expect.poll(currentRoute).toBe(landingRoute('Contributor'));
  });

  it('keeps a contributor on their own profile settings', async () => {
    // The settings app owns its request graph; this spec asserts only the shell routing.
    allowUnhandledRequests();
    await renderAdminApp(`/settings/staff/${OWNER_SLUG}`, asRole('Contributor'));

    await expect.poll(currentRoute).toBe(`/settings/staff/${OWNER_SLUG}`);
  });

  it("redirects an author away from another staff member's profile settings", async () => {
    await renderAdminApp('/settings/staff/someone-else', asRole('Author'));

    await expect.poll(currentRoute).toBe(landingRoute('Author'));
  });

  it('redirects a contributor away from tags', async () => {
    await renderAdminApp('/tags', asRole('Contributor'));

    await expect.poll(currentRoute).toBe(landingRoute('Contributor'));
  });

  it('redirects an editor away from members', async () => {
    await renderAdminApp('/members', asRole('Editor'));

    await expect.poll(currentRoute).toBe(landingRoute('Editor'));
  });

  it.each(['Editor', 'Author', 'Contributor'] as const)(
    'denies %s access to member activity before loading events',
    async (role) => {
      const events = fakeAdminEndpoint('GET', /^\/members\/events\//, { events: [] });
      await renderAdminApp('/members-activity?member=abcdef123456abcdef123456', asRole(role));

      await expect.poll(currentRoute).toBe(landingRoute(role));
      expect(events.requests).toHaveLength(0);
    },
  );

  it.each(['Super Editor', 'Editor', 'Author', 'Contributor'] as const)(
    'redirects %s away from migrate',
    async (role) => {
      await renderAdminApp('/migrate/substack', asRole(role));

      await expect.poll(currentRoute).toBe(landingRoute(role));
      await expect.element(migrateScreen.frame()).not.toBeInTheDocument();
    },
  );

  it.each(['/site', '/migrate', '/posts', '/pages', '/members-activity'])(
    'redirects %s to billing during a force upgrade',
    async (path) => {
      const config = configResponse();
      config.config.hostSettings = { forceUpgrade: true };

      await renderAdminApp(path, { boot: { browseConfig: { response: config } } });

      await expect.poll(currentRoute).toBe('/pro');
    },
  );

  it('redirects members to billing during a force upgrade', async () => {
    const config = configResponse();
    config.config.hostSettings = { forceUpgrade: true };

    await renderAdminApp('/members', { boot: { browseConfig: { response: config } } });

    await expect.poll(currentRoute).toBe('/pro');
  });

  it('leaves an authorized user on the route', async () => {
    fakeTags([]);
    await renderAdminApp('/tags');

    await expect.poll(currentRoute).toBe('/tags');
  });
});
