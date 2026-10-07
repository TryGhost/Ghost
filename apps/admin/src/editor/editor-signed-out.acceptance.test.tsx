import { beforeEach, expect, it, vi } from 'vitest';
import {
  currentRoute,
  fakeAdminEndpoint,
  fakeSetupStatus,
  plainText,
  renderAdminApp,
  signedOut,
} from '@test-utils/acceptance';
import { authScreen } from '@/auth/auth.screen';
import { reloadAdmin } from '@/auth/reload';

// Signed-out boots live apart from the signed-in editor specs: once this page
// load has seen the session work, a later 403 would take the test page away.

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

beforeEach(() => {
  vi.mocked(reloadAdmin).mockClear();
  window.sessionStorage.clear();
});

it('asks a signed-out writer to sign in and reopens the post afterwards', async () => {
  fakeSetupStatus();
  fakeAdminEndpoint('POST', '/session/', plainText('Created'), {
    status: 201,
    contentType: 'text/plain; charset=utf-8',
  });
  await renderAdminApp('/editor/post/abc123', signedOut({ authReact: true }));

  await expect.poll(currentRoute).toBe('/signin');
  await authScreen.signIn('owner@example.com', 'correct horse battery');

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/editor/post/abc123']]);
});
