import { beforeEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import {
  currentRoute,
  fakeAdminEndpoint,
  fakeSetupStatus,
  plainText,
  renderAdminApp,
  signedOut,
  siteResponse,
} from '@test-utils/acceptance';
import { authScreen } from './auth.screen';
import { reloadAdmin } from './reload';

vi.mock('./reload', () => ({ reloadAdmin: vi.fn() }));

const SIGNIN_REDIRECT_KEY = 'ghost-signin-redirect';

const ghostError = (status: number, error: Record<string, unknown>) =>
  [{ errors: [error] }, { status }] as const;

const emberFrameHidden = () => document.getElementById('ember-app')?.parentElement?.hidden;

beforeEach(() => {
  vi.mocked(reloadAdmin).mockClear();
  window.sessionStorage.clear();
});

it('serves sign in from React when the site hands the auth screens over', async () => {
  fakeSetupStatus();
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await expect.element(authScreen.emailInput()).toBeVisible();
  await expect.element(authScreen.signInButton()).toBeVisible();
  expect(emberFrameHidden()).toBe(true);
});

it.each([
  ['a server that predates the flag', undefined],
  ['the flag off', false],
])('leaves sign in to Ember on %s', async (_case, authReact) => {
  await renderAdminApp('/signin', signedOut({ authReact }));

  await expect.poll(emberFrameHidden).toBe(false);
  await expect(authScreen.signInButton()).toHaveCount(0);
});

it('shows the boot loader until it knows who serves sign in', async () => {
  let releaseSite = () => {};
  const siteReleased = new Promise<void>((resolve) => {
    releaseSite = resolve;
  });
  const { boot } = signedOut();
  const browseSite = {
    response: async () => {
      await siteReleased;
      return siteResponse();
    },
  };
  await renderAdminApp('/signin', { boot: { ...boot, browseSite } });

  const bootLoader = page.getByRole('status', { name: 'Loading Ghost Admin' });
  await expect.element(bootLoader).toBeVisible();
  expect(emberFrameHidden()).toBe(true);

  releaseSite();

  await expect.poll(emberFrameHidden).toBe(false);
  await expect(bootLoader).toHaveCount(0);
});

it('serves sign in from React with the Labs URL override', async () => {
  fakeSetupStatus();
  await renderAdminApp('/signin?labs=authReact', signedOut());

  await expect.element(authScreen.signInButton()).toBeVisible();
});

it('sends a signed-out visitor to sign in and remembers where they were going', async () => {
  fakeSetupStatus();
  await renderAdminApp('/settings/newsletters?verifyEmail=abc', signedOut({ authReact: true }));

  await expect.poll(currentRoute).toBe('/signin');
  expect(window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY)).toBe(
    '/settings/newsletters?verifyEmail=abc',
  );
});

it('remembers the latest route a signed-out visitor asked for', async () => {
  fakeSetupStatus();
  window.sessionStorage.setItem(SIGNIN_REDIRECT_KEY, '/tags');
  await renderAdminApp('/members', signedOut({ authReact: true }));

  await expect.poll(currentRoute).toBe('/signin');
  expect(window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY)).toBe('/members');
});

it('sends every auth screen to setup on a site that is not set up', async () => {
  fakeSetupStatus({ status: false });
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await expect.poll(currentRoute).toBe('/setup');
});

it('signs in and reloads onto the route the visitor was going to', async () => {
  fakeSetupStatus();
  window.sessionStorage.setItem(SIGNIN_REDIRECT_KEY, '/tags');
  const sessionApi = fakeAdminEndpoint('POST', '/session/', plainText('Created'), {
    status: 201,
    contentType: 'text/plain; charset=utf-8',
  });
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.signIn('owner@example.com', 'correct horse battery');

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/tags']]);
  expect(sessionApi.lastRequest?.body).toEqual({
    username: 'owner@example.com',
    password: 'correct horse battery',
  });
  expect(window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY)).toBeNull();
});

it('asks for the whole form before signing in', async () => {
  fakeSetupStatus();
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.signInButton().click();

  await expect.element(authScreen.text('Please fill out the form to sign in.')).toBeVisible();
  await expect.element(authScreen.retryButton()).toBeVisible();
  await expect.element(authScreen.emailInput()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(authScreen.passwordInput()).toHaveAttribute('aria-invalid', 'true');
});

it('marks the password when Core rejects it', async () => {
  fakeSetupStatus();
  fakeAdminEndpoint(
    'POST',
    '/session/',
    ...ghostError(422, {
      type: 'ValidationError',
      code: 'PASSWORD_INCORRECT',
      message: 'Your password is incorrect.',
      context: 'Your password is incorrect.',
    }),
  );
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.signIn('owner@example.com', 'wrong password here');

  await expect.element(authScreen.text('Your password is incorrect.')).toBeVisible();
  await expect.element(authScreen.passwordInput()).toHaveAttribute('aria-invalid', 'true');
  await expect.element(authScreen.emailInput()).not.toHaveAttribute('aria-invalid');
  await expect.element(authScreen.retryButton()).toBeVisible();
});

it('shows the full rate-limit message', async () => {
  fakeSetupStatus();
  fakeAdminEndpoint(
    'POST',
    '/session/',
    ...ghostError(429, {
      type: 'TooManyRequestsError',
      message:
        'Too many login attempts. Please wait 10 minutes before trying again, or reset your password.',
      context: 'Too many login attempts.',
    }),
  );
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.signIn('owner@example.com', 'correct horse battery');

  await expect
    .element(
      authScreen.text(
        'Too many login attempts. Please wait 10 minutes before trying again, or reset your password.',
      ),
    )
    .toBeVisible();
});

it.each([
  ['2FA_TOKEN_REQUIRED', '2FA confirmation'],
  ['2FA_NEW_DEVICE_DETECTED', "Verify it's really you"],
])('asks for the emailed code when Core answers %s', async (code, heading) => {
  fakeSetupStatus();
  fakeAdminEndpoint(
    'POST',
    '/session/',
    ...ghostError(403, {
      type: 'Needs2FAError',
      code,
      message: 'User must verify session to login.',
      context:
        'A 6-digit sign-in verification code has been sent to your email to keep your account safe.',
    }),
  );
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.signIn('owner@example.com', 'correct horse battery');

  await expect.poll(currentRoute).toBe('/signin/verify');
  await expect.element(authScreen.heading(heading)).toBeVisible();
  expect(reloadAdmin).not.toHaveBeenCalled();
});

it('explains that a locked account has been sent a reset email', async () => {
  fakeSetupStatus();
  fakeAdminEndpoint(
    'POST',
    '/session/',
    ...ghostError(401, {
      type: 'PasswordResetRequiredError',
      message:
        'For security, you need to create a new password. An email has been sent to you with instructions!',
    }),
  );
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.signIn('owner@example.com', 'correct horse battery');

  await expect.element(authScreen.heading('Update your password.')).toBeVisible();
  await expect(authScreen.signInButton()).toHaveCount(0);
});

it('needs a valid email before sending a password reset', async () => {
  fakeSetupStatus();
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.forgotButton().click();

  await expect
    .element(authScreen.text('We need your email address to reset your password.'))
    .toBeVisible();
  await expect.element(authScreen.emailInput()).toHaveAttribute('aria-invalid', 'true');
});

it('sends a password reset email for the entered address', async () => {
  fakeSetupStatus();
  const resetApi = fakeAdminEndpoint('POST', '/authentication/password_reset/', {
    password_reset: [{ message: 'Check your email for further instructions.' }],
  });
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.emailInput().fill('owner@example.com');
  await authScreen.forgotButton().click();

  await expect
    .element(authScreen.text('An email with password reset instructions has been sent.'))
    .toBeVisible();
  expect(resetApi.lastRequest?.body).toEqual({ password_reset: [{ email: 'owner@example.com' }] });
});

it('marks the email when no staff user has it', async () => {
  fakeSetupStatus();
  fakeAdminEndpoint(
    'POST',
    '/authentication/password_reset/',
    ...ghostError(404, { type: 'NotFoundError', message: 'User not found.' }),
  );
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.emailInput().fill('nobody@example.com');
  await authScreen.forgotButton().click();

  await expect.element(authScreen.text('User not found.')).toBeVisible();
  await expect.element(authScreen.emailInput()).toHaveAttribute('aria-invalid', 'true');
});

it('reports a failure without an answer from Ghost as a server problem', async () => {
  fakeSetupStatus();
  fakeAdminEndpoint('POST', '/session/', plainText('<html>Bad Gateway</html>'), {
    status: 502,
    contentType: 'text/html',
  });
  await renderAdminApp('/signin', signedOut({ authReact: true }));

  await authScreen.signIn('owner@example.com', 'correct horse battery');

  await expect.element(authScreen.text('There was a problem on the server.')).toBeVisible();
  await expect.element(authScreen.retryButton()).toBeVisible();
});
