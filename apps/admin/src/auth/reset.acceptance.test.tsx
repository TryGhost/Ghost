import { beforeEach, expect, it, vi } from 'vitest';
import {
  authToken,
  fakeAdminEndpoint,
  fakeSetupStatus,
  renderAdminApp,
  signedOut,
} from '@test-utils/acceptance';
import { authScreen } from './auth.screen';
import { reloadAdmin } from './reload';

vi.mock('./reload', () => ({ reloadAdmin: vi.fn() }));

const token = authToken('owner@example.com');

beforeEach(() => {
  vi.mocked(reloadAdmin).mockClear();
  window.sessionStorage.clear();
  fakeSetupStatus();
});

it('asks for a new password, focused', async () => {
  await renderAdminApp(`/reset/${token}`, signedOut({ authReact: true }));

  await expect.element(authScreen.heading('Reset your password.')).toBeVisible();
  await expect.element(authScreen.newPasswordInput()).toHaveFocus();
});

it.each([
  ['', '', 'Please enter a password.'],
  ['correct horse battery', 'correct horse', "The two new passwords don't match."],
  ['short', 'short', 'Password must be at least 10 characters long.'],
  ['owner@example.com', 'owner@example.com', 'Sorry, you cannot use the email as your password.'],
])('checks %j before saving', async (newPassword, confirmation, message) => {
  await renderAdminApp(`/reset/${token}`, signedOut({ authReact: true }));

  await authScreen.newPasswordInput().fill(newPassword);
  await authScreen.confirmPasswordInput().fill(confirmation);
  await authScreen.saveNewPasswordButton().click();

  await expect.element(authScreen.text(message)).toBeVisible();
  await expect.element(authScreen.retryButton()).toBeVisible();
});

it('saves the password and reloads signed in, confirming once loaded', async () => {
  const resetApi = fakeAdminEndpoint('PUT', '/authentication/password_reset/', {
    password_reset: [{ message: 'Password updated' }],
  });
  await renderAdminApp(`/reset/${token}`, signedOut({ authReact: true }));

  await authScreen.newPasswordInput().fill('correct horse battery');
  await authScreen.confirmPasswordInput().fill('correct horse battery');
  await authScreen.saveNewPasswordButton().click();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/']]);
  expect(resetApi.lastRequest?.body).toEqual({
    password_reset: [
      { token, newPassword: 'correct horse battery', ne2Password: 'correct horse battery' },
    ],
  });
  expect(window.sessionStorage.getItem('ghost-admin:auth-notice')).toBe('Password updated');
});

it.each([
  [401, 'Invalid password reset link.', 'Cannot reset password. Invalid password reset link.'],
  [400, 'Password reset link expired.', 'Cannot reset password. Password reset link expired.'],
])('reports a rejected link (%i)', async (status, context, message) => {
  fakeAdminEndpoint(
    'PUT',
    '/authentication/password_reset/',
    { errors: [{ type: 'BadRequestError', message: 'Cannot reset password.', context }] },
    { status },
  );
  await renderAdminApp(`/reset/${token}`, signedOut({ authReact: true }));

  await authScreen.newPasswordInput().fill('correct horse battery');
  await authScreen.confirmPasswordInput().fill('correct horse battery');
  await authScreen.saveNewPasswordButton().click();

  await expect.element(authScreen.text(message)).toBeVisible();
  expect(reloadAdmin).not.toHaveBeenCalled();
});
