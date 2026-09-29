import { beforeEach, expect, it, vi } from 'vitest';
import {
  authToken,
  currentRoute,
  fakeAdminEndpoint,
  fakeSetupStatus,
  plainText,
  renderAdminApp,
  signedOut,
} from '@test-utils/acceptance';
import { authScreen } from './auth.screen';
import { reloadAdmin } from './reload';

vi.mock('./reload', () => ({ reloadAdmin: vi.fn() }));

const token = authToken('staff@example.com');

const fakeInvitation = (valid: boolean) =>
  fakeAdminEndpoint('GET', /^\/authentication\/invitation\/\?email=/, { invitation: [{ valid }] });

beforeEach(() => {
  vi.mocked(reloadAdmin).mockClear();
  window.sessionStorage.clear();
  fakeSetupStatus();
});

it('checks the invitation for the email in the link and prefills it', async () => {
  const invitationApi = fakeInvitation(true);
  await renderAdminApp(`/signup/${token}`, signedOut({ authReact: true }));

  await expect.element(authScreen.heading('Create your account.')).toBeVisible();
  await expect.element(authScreen.emailInput()).toHaveValue('staff@example.com');
  await expect.element(authScreen.emailInput()).toBeDisabled();
  expect(invitationApi.lastRequest?.url).toContain('email=staff%40example.com');
});

it('sends a malformed link to sign in', async () => {
  await renderAdminApp('/signup/not*a*token', signedOut({ authReact: true }));

  await expect.poll(currentRoute).toBe('/signin');
  await expect.element(authScreen.text('Invalid token.')).toBeVisible();
});

it('sends a used or revoked invitation to sign in', async () => {
  fakeInvitation(false);
  await renderAdminApp(`/signup/${token}`, signedOut({ authReact: true }));

  await expect.poll(currentRoute).toBe('/signin');
  await expect
    .element(authScreen.text('The invitation does not exist or is no longer valid.'))
    .toBeVisible();
});

it('checks each field as it is left, and the whole form on submit', async () => {
  fakeInvitation(true);
  await renderAdminApp(`/signup/${token}`, signedOut({ authReact: true }));

  await authScreen.passwordInput().fill('short');
  (authScreen.passwordInput().element() as HTMLElement).blur();
  await expect
    .element(authScreen.text('Password must be at least 10 characters long.'))
    .toBeVisible();

  await authScreen.createAccountButton().click();
  await expect.element(authScreen.text('Please enter a name.')).toBeVisible();
  await expect
    .element(authScreen.text('Please fill out the form to complete your signup'))
    .toBeVisible();
});

it('creates the account, signs in and reloads', async () => {
  fakeInvitation(true);
  const acceptApi = fakeAdminEndpoint('POST', '/authentication/invitation/', {
    invitation: [{ message: 'Invitation accepted.' }],
  });
  const sessionApi = fakeAdminEndpoint('POST', '/session/', plainText('Created'), {
    status: 201,
    contentType: 'text/plain; charset=utf-8',
  });
  await renderAdminApp(`/signup/${token}`, signedOut({ authReact: true }));

  await authScreen.fullNameInput().fill('  Jamie Larson  ');
  await authScreen.passwordInput().fill('correct horse battery');
  await authScreen.createAccountButton().click();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/']]);
  expect(acceptApi.lastRequest?.body).toEqual({
    invitation: [
      {
        token,
        name: 'Jamie Larson',
        password: 'correct horse battery',
        email: 'staff@example.com',
      },
    ],
  });
  expect(sessionApi.lastRequest?.body).toEqual({
    username: 'staff@example.com',
    password: 'correct horse battery',
  });
});

it('reports why the invitation could not be accepted', async () => {
  fakeInvitation(true);
  fakeAdminEndpoint(
    'POST',
    '/authentication/invitation/',
    {
      errors: [
        {
          type: 'ValidationError',
          message: 'Could not create an account, email is already in use.',
          context: 'Attempting to create an account with existing email address.',
        },
      ],
    },
    { status: 422 },
  );
  await renderAdminApp(`/signup/${token}`, signedOut({ authReact: true }));

  await authScreen.fullNameInput().fill('Jamie Larson');
  await authScreen.passwordInput().fill('correct horse battery');
  await authScreen.createAccountButton().click();

  await expect
    .element(authScreen.text('Could not create an account, email is already in use.'))
    .toBeVisible();
  await expect.element(authScreen.retryButton()).toBeVisible();
});
