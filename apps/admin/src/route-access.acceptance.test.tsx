import { beforeEach, describe, expect, it } from 'vitest';

import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';

// Denied routes redirect to the home route through the router; only the home
// dispatch itself may then hand off cross-app (asserted in home.acceptance).
const homeHandoff = (): unknown => JSON.parse(document.body.dataset.externalNavigate ?? 'null');

const OWNER_SLUG = currentUserResponse().users[0].slug as string;

describe('Route access', () => {
  // The recorded handoff lives on the host page, which outlives a single test.
  beforeEach(() => {
    delete document.body.dataset.externalNavigate;
  });

  it('redirects a contributor away from settings', async () => {
    await renderAdminApp('/settings/design', { user: { roles: ['Contributor'] } });

    await expect.poll(currentRoute).toBe('/');
  });

  it('keeps a contributor on their own profile settings', async () => {
    // The settings app owns its request graph; this spec asserts only the shell routing.
    allowUnhandledRequests();
    await renderAdminApp(`/settings/staff/${OWNER_SLUG}`, { user: { roles: ['Contributor'] } });

    await expect.poll(currentRoute).toBe(`/settings/staff/${OWNER_SLUG}`);
    expect(homeHandoff()).toBe(null);
  });

  it("redirects an author away from another staff member's profile settings", async () => {
    await renderAdminApp('/settings/staff/someone-else', { user: { roles: ['Author'] } });

    await expect.poll(currentRoute).toBe('/');
  });

  it('redirects a contributor away from tags', async () => {
    await renderAdminApp('/tags', { user: { roles: ['Contributor'] } });

    await expect.poll(currentRoute).toBe('/');
  });

  it('redirects an editor away from members', async () => {
    await renderAdminApp('/members', { user: { roles: ['Editor'] } });

    await expect.poll(currentRoute).toBe('/');
  });

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
    expect(homeHandoff()).toBe(null);
  });
});
