import { beforeEach, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { deferred } from '@/utils/deferred';
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
  await renderAdminApp('/signin/verify', signedOut());

  await expect.element(authScreen.heading('Verify it’s really you')).toBeVisible();
  await expect.element(authScreen.text(/signing in from a new device/)).toBeVisible();
});

it.each([
  ['', 'Verification code is required'],
  ['12345', 'Verification code must be 6 numbers'],
])('checks the code %j before sending it', async (code, message) => {
  await renderAdminApp('/signin/verify', signedOut());

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
  await renderAdminApp('/signin/verify', signedOut());

  await authScreen.codeInput().fill('123456');

  await expect.element(authScreen.text('Your verification code is incorrect.')).toBeVisible();
  await authScreen.codeInput().click();
  await expect
    .poll(
      () =>
        getComputedStyle(authScreen.codeInput().element().closest('[data-slot="input-group"]')!)
          .borderColor,
    )
    .toBe(
      getComputedStyle(authScreen.text('Your verification code is incorrect.').element()).color,
    );
  await authScreen.codeInput().fill('65432');
  await expect(authScreen.text('Your verification code is incorrect.')).toHaveCount(0);
  await expect.element(authScreen.verifyButton()).toBeVisible();
});

it('automatically verifies a complete code and reloads onto the remembered route', async () => {
  window.sessionStorage.setItem('ghost-signin-redirect', '/members');
  const verifyApi = fakeAdminEndpoint('PUT', '/session/verify/', plainText('OK'), textReply);
  await renderAdminApp('/signin/verify', signedOut());

  await authScreen.codeInput().fill(' 123456 ');

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/members']]);
  expect(verifyApi.lastRequest?.body).toEqual({ token: '123456' });
  expect(verifyApi.requests).toHaveLength(1);
});

it('waits for the sixth digit before automatically verifying a typed code', async () => {
  const verifyApi = fakeAdminEndpoint('PUT', '/session/verify/', plainText('OK'), textReply);
  await renderAdminApp('/signin/verify', signedOut());

  await userEvent.type(authScreen.codeInput(), '01234');
  expect(verifyApi.requests).toHaveLength(0);
  await userEvent.type(authScreen.codeInput(), '5');

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/']]);
  expect(verifyApi.lastRequest?.body).toEqual({ token: '012345' });
  expect(verifyApi.requests).toHaveLength(1);
});

it('automatically verifies a pasted code', async () => {
  const verifyApi = fakeAdminEndpoint('PUT', '/session/verify/', plainText('OK'), textReply);
  await renderAdminApp('/signin/verify', signedOut());

  const source = document.createElement('textarea');
  source.setAttribute('aria-label', 'Copied verification code');
  source.value = ' 012345 ';
  document.body.append(source);
  try {
    await userEvent.click(source);
    source.select();
    await userEvent.copy();
  } finally {
    source.remove();
  }
  await authScreen.codeInput().click();
  await userEvent.paste();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/']]);
  expect(verifyApi.lastRequest?.body).toEqual({ token: '012345' });
  expect(verifyApi.requests).toHaveLength(1);
});

it('does not automatically submit incomplete or malformed codes', async () => {
  const verifyApi = fakeAdminEndpoint('PUT', '/session/verify/', plainText('OK'), textReply);
  await renderAdminApp('/signin/verify', signedOut());

  for (const code of ['12345', '1234567', '12345a']) {
    await authScreen.codeInput().fill(code);
    await expect.element(authScreen.verifyButton()).toBeEnabled();
    expect(verifyApi.requests).toHaveLength(0);
  }
});

it('locks the code while verification is pending and ignores Enter', async () => {
  const response = deferred<void>();
  const verifyApi = fakeAdminEndpoint(
    'PUT',
    '/session/verify/',
    async () => {
      await response.promise;
      return plainText('OK');
    },
    textReply,
  );
  await renderAdminApp('/signin/verify', signedOut());

  try {
    await authScreen.codeInput().fill('123456');
    await expect.poll(() => verifyApi.requests.length).toBe(1);
    await expect.element(authScreen.codeInput()).toBeDisabled();
    await expect.element(authScreen.verifyButton()).toBeDisabled();
    await userEvent.keyboard('{Enter}');
    await expect.element(authScreen.verifyButton()).toBeDisabled();
    expect(verifyApi.requests).toHaveLength(1);
  } finally {
    response.resolve();
  }

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/']]);
  expect(verifyApi.requests).toHaveLength(1);
});

it('automatically verifies a corrected code after a rejection', async () => {
  const rejection = deferred<void>();
  const verifyApi = fakeAdminEndpoint(
    'PUT',
    '/session/verify/',
    async ({ body }) => {
      if ((body as { token: string }).token === '654321') {
        return plainText('OK');
      }
      await rejection.promise;
      return new Response('Unauthorized', { status: 401 });
    },
    textReply,
  );
  await renderAdminApp('/signin/verify', signedOut());

  try {
    await authScreen.codeInput().fill('123456');
    await expect.poll(() => verifyApi.requests.length).toBe(1);
    await expect.element(authScreen.codeInput()).toBeDisabled();
  } finally {
    rejection.resolve();
  }
  await expect.element(authScreen.text('Your verification code is incorrect.')).toBeVisible();
  await expect.element(authScreen.codeInput()).toBeEnabled();
  await authScreen.codeInput().fill('654321');

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/']]);
  expect(verifyApi.requests).toHaveLength(2);
});

it('resends the code, then holds the button while the new one arrives', async () => {
  const resendApi = fakeAdminEndpoint('POST', '/session/verify/', plainText('OK'), textReply);
  await renderAdminApp('/signin/verify', signedOut());

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
  await renderAdminApp('/signin/verify', signedOut());

  await authScreen.resendButton().click();

  await expect.element(authScreen.text('Too many attempts.')).toBeVisible();
  await expect.element(authScreen.resendButton()).toBeEnabled();
});
