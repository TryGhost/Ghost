import { beforeEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeSetupStatus,
  plainText,
  renderAdminApp,
  signedOut,
} from '@test-utils/acceptance';
import { authScreen } from './auth.screen';
import { reloadAdmin } from './reload';

vi.mock('./reload', () => ({ reloadAdmin: vi.fn() }));

const textReply = { contentType: 'text/plain; charset=utf-8' };

beforeEach(() => {
  vi.mocked(reloadAdmin).mockClear();
  window.sessionStorage.clear();
  fakeSetupStatus();
});

it('shows the new-device copy when opened directly', async () => {
  await renderAdminApp('/signin/verify', signedOut({ authReact: true }));

  await expect.element(authScreen.heading("Verify it's really you")).toBeVisible();
  await expect.element(authScreen.text(/signing in from a new device/)).toBeVisible();
});

it.each([
  ['', 'Verification code is required'],
  ['12345', 'Verification code must be 6 numbers'],
])('checks the code %j before sending it', async (code, message) => {
  await renderAdminApp('/signin/verify', signedOut({ authReact: true }));

  await authScreen.codeInput().fill(code);
  await authScreen.verifyButton().click();

  await expect.element(authScreen.text(message)).toBeVisible();
  await expect.element(authScreen.codeInput()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(authScreen.retryButton()).toBeVisible();
});

it('says a rejected code is incorrect, and clears that when typing again', async () => {
  fakeAdminEndpoint('PUT', '/session/verify/', plainText('Unauthorized'), {
    status: 401,
    ...textReply,
  });
  await renderAdminApp('/signin/verify', signedOut({ authReact: true }));

  await authScreen.codeInput().fill('123456');
  await authScreen.verifyButton().click();

  await expect.element(authScreen.text('Your verification code is incorrect.')).toBeVisible();
  await authScreen.codeInput().fill('654321');
  await expect(authScreen.text('Your verification code is incorrect.')).toHaveCount(0);
  await expect.element(authScreen.verifyButton()).toBeVisible();
});

it('verifies the code and reloads onto the remembered route', async () => {
  window.sessionStorage.setItem('ghost-signin-redirect', '/members');
  const verifyApi = fakeAdminEndpoint('PUT', '/session/verify/', plainText('OK'), textReply);
  await renderAdminApp('/signin/verify', signedOut({ authReact: true }));

  await authScreen.codeInput().fill(' 123456 ');
  await authScreen.verifyButton().click();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/members']]);
  expect(verifyApi.lastRequest?.body).toEqual({ token: '123456' });
});

it('resends the code, then holds the button while the new one arrives', async () => {
  const resendApi = fakeAdminEndpoint('POST', '/session/verify/', plainText('OK'), textReply);
  await renderAdminApp('/signin/verify', signedOut({ authReact: true }));

  await authScreen.resendButton().click();

  await expect.element(page.getByRole('button', { name: 'Sent' })).toBeDisabled();
  expect(resendApi.requests).toHaveLength(1);
});

it('shows why a resend failed', async () => {
  fakeAdminEndpoint(
    'POST',
    '/session/verify/',
    { errors: [{ type: 'TooManyRequestsError', message: 'Too many attempts.' }] },
    { status: 429 },
  );
  await renderAdminApp('/signin/verify', signedOut({ authReact: true }));

  await authScreen.resendButton().click();

  await expect.element(authScreen.text('Too many attempts.')).toBeVisible();
  await expect.element(authScreen.resendButton()).toBeEnabled();
});
