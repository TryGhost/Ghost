import { beforeEach, expect, it, vi } from 'vitest';
import {
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

beforeEach(() => {
  vi.mocked(reloadAdmin).mockClear();
  window.sessionStorage.clear();
});

it('sends a set-up site to sign in', async () => {
  fakeSetupStatus({ status: true });
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await expect.poll(currentRoute).toBe('/signin');
});

it('prefills the configured site details, focused on the title', async () => {
  fakeSetupStatus({
    status: false,
    title: 'Jamie&apos;s Blog',
    name: 'Jamie O&apos;Neil',
    email: 'jamie@example.com',
  });
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await expect.element(authScreen.siteTitleInput()).toHaveValue("Jamie's Blog");
  await expect.element(authScreen.siteTitleInput()).toHaveFocus();
  await expect.element(authScreen.fullNameInput()).toHaveValue("Jamie O'Neil");
  await expect.element(authScreen.emailInput()).toHaveValue('jamie@example.com');
});

it('checks every field on submit', async () => {
  fakeSetupStatus({ status: false });
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await authScreen.startPublishingButton().click();

  await expect.element(authScreen.text('Enter a site title.')).toBeVisible();
  await expect.element(authScreen.text('Enter a name.')).toBeVisible();
  await expect.element(authScreen.text('Enter an email.')).toBeVisible();
  await expect
    .element(authScreen.text('Fill out every field correctly to set up your site.'))
    .toBeVisible();
});

it('creates the owner, signs in and starts onboarding', async () => {
  fakeSetupStatus({ status: false });
  const setupApi = fakeAdminEndpoint(
    'POST',
    '/authentication/setup/',
    { users: [{}] },
    { status: 201 },
  );
  fakeAdminEndpoint('POST', '/session/', plainText('Created'), {
    status: 201,
    contentType: 'text/plain; charset=utf-8',
  });
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await authScreen.siteTitleInput().fill('  The Daily Awesome  ');
  await authScreen.fullNameInput().fill('Jamie Larson');
  await authScreen.emailInput().fill('jamie@example.com');
  await authScreen.passwordInput().fill('correct horse battery');
  await authScreen.startPublishingButton().click();

  await expect.poll(() => vi.mocked(reloadAdmin).mock.calls).toEqual([['/?firstStart=true']]);
  expect(setupApi.lastRequest?.body).toEqual({
    setup: [
      {
        blogTitle: 'The Daily Awesome',
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        password: 'correct horse battery',
      },
    ],
  });
});

it('shows why the server refused the details', async () => {
  fakeSetupStatus({ status: false });
  fakeAdminEndpoint(
    'POST',
    '/authentication/setup/',
    {
      errors: [
        {
          type: 'ValidationError',
          message: 'Sorry, you cannot use an insecure password.',
          context: null,
        },
      ],
    },
    { status: 422 },
  );
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await authScreen.siteTitleInput().fill('The Daily Awesome');
  await authScreen.fullNameInput().fill('Jamie Larson');
  await authScreen.emailInput().fill('jamie@example.com');
  await authScreen.passwordInput().fill('correct horse battery');
  await authScreen.startPublishingButton().click();

  await expect
    .element(authScreen.text('Sorry, you cannot use an insecure password.'))
    .toBeVisible();
  expect(reloadAdmin).not.toHaveBeenCalled();
});

it('sends the new owner to sign in when signing in right after setup fails', async () => {
  let setupDone = false;
  fakeAdminEndpoint('GET', '/authentication/setup/', () => ({ setup: [{ status: setupDone }] }));
  const setupApi = fakeAdminEndpoint('POST', '/authentication/setup/', () => {
    setupDone = true;
    return { users: [{}] };
  });
  fakeAdminEndpoint(
    'POST',
    '/session/',
    { errors: [{ type: 'UnauthorizedError', message: 'Access Denied.' }] },
    { status: 401 },
  );
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await authScreen.siteTitleInput().fill('The Daily Awesome');
  await authScreen.fullNameInput().fill('Jamie Larson');
  await authScreen.emailInput().fill('jamie@example.com');
  await authScreen.passwordInput().fill('correct horse battery');
  await authScreen.startPublishingButton().click();

  await expect.element(authScreen.text('Access Denied.')).toBeVisible();
  await expect.poll(currentRoute).toBe('/signin');
  await expect.element(authScreen.signInButton()).toBeVisible();
  expect(setupApi.requests).toHaveLength(1);
});

it('moves on to sign in when the server reports the site is already set up', async () => {
  let setupDone = false;
  fakeAdminEndpoint('GET', '/authentication/setup/', () => ({ setup: [{ status: setupDone }] }));
  fakeAdminEndpoint(
    'POST',
    '/authentication/setup/',
    () => {
      setupDone = true;
      return {
        errors: [{ type: 'NoPermissionError', message: 'Setup has already been completed.' }],
      };
    },
    { status: 403 },
  );
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await authScreen.siteTitleInput().fill('The Daily Awesome');
  await authScreen.fullNameInput().fill('Jamie Larson');
  await authScreen.emailInput().fill('jamie@example.com');
  await authScreen.passwordInput().fill('correct horse battery');
  await authScreen.startPublishingButton().click();

  await expect.element(authScreen.text('Setup has already been completed.')).toBeVisible();
  await expect.poll(currentRoute).toBe('/signin');
});

it('lets the owner submit again when neither setup nor the server answered', async () => {
  fakeSetupStatus({ status: false });
  fakeAdminEndpoint('POST', '/authentication/setup/', plainText('<html>Bad Gateway</html>'), {
    status: 502,
    contentType: 'text/html',
  });
  await renderAdminApp('/setup', signedOut({ authReact: true }));

  await authScreen.siteTitleInput().fill('The Daily Awesome');
  await authScreen.fullNameInput().fill('Jamie Larson');
  await authScreen.emailInput().fill('jamie@example.com');
  await authScreen.passwordInput().fill('correct horse battery');
  await authScreen.startPublishingButton().click();

  await expect.element(authScreen.text('There was a problem on the server.')).toBeVisible();
  await expect.element(authScreen.startPublishingButton()).toBeEnabled();
  expect(currentRoute()).toBe('/setup');
});
