import { beforeEach, expect, it, vi } from 'vitest';
import {
  allowUnhandledRequests,
  authToken,
  currentRoute,
  fakeAdminEndpoint,
  renderAdminApp,
} from '@test-utils/acceptance';
import { authScreen } from './auth.screen';
import { reloadAdmin } from './reload';

// Signed-in boots live apart from the signed-out specs: once this page load
// has seen the session work, a later 403 would take the test page away.

vi.mock('./reload', () => ({ reloadAdmin: vi.fn() }));

beforeEach(() => {
  vi.mocked(reloadAdmin).mockClear();
  window.sessionStorage.clear();
});

it('sends a signed-in user away from sign in', async () => {
  // The analytics dashboard it lands on owns its request graph.
  allowUnhandledRequests();
  await renderAdminApp('/signin');

  await expect.poll(currentRoute).toBe('/analytics');
});

it.each([
  [
    'reset',
    `/reset/${authToken('owner@example.com')}`,
    "You can't reset your password while you're signed in.",
  ],
  [
    'signup',
    `/signup/${authToken('staff@example.com')}`,
    'You need to sign out to register as a new user.',
  ],
])('warns a signed-in user off %s', async (_screen, route, warning) => {
  // The analytics dashboard it lands on owns its request graph.
  allowUnhandledRequests();
  await renderAdminApp(route);

  await expect.element(authScreen.text(warning)).toBeVisible();
  await expect.poll(currentRoute).toBe('/analytics');
});

it('signs out and reloads onto sign in', async () => {
  const sessionApi = fakeAdminEndpoint('DELETE', '/session/', null, { status: 204 });
  await renderAdminApp('/signout');

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/signin']]);
  expect(sessionApi.requests).toHaveLength(1);
});

it('confirms a password reset once the admin has reloaded', async () => {
  window.sessionStorage.setItem('ghost-admin:auth-notice', 'password-updated');
  await renderAdminApp('/tags');
  fakeAdminEndpoint('GET', /^\/tags\//, { tags: [], meta: { pagination: { next: null } } });

  await expect.element(authScreen.text('Password updated')).toBeVisible();
  expect(window.sessionStorage.getItem('ghost-admin:auth-notice')).toBeNull();
});
