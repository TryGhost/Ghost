import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeSetupStatus, renderAdminApp, signedOut, siteResponse } from '@test-utils/acceptance';
import { authScreen } from './auth.screen';

const SIGNIN_URL = 'https://idp.example.com/ghost/start';

function signedOutWithSSO(sso: { sso_signin_url: string; sso_signin_label?: string }) {
  const site = siteResponse();
  Object.assign(site.site, sso);
  const options = signedOut();

  return { ...options, boot: { ...options.boot, browseSite: { response: site } } };
}

it.each(['/signin', '/signin/verify', '/reset/token', '/signup/token'])(
  'replaces %s with the SSO sign-in link',
  async (route) => {
    fakeSetupStatus();
    await renderAdminApp(route, signedOutWithSSO({ sso_signin_url: SIGNIN_URL }));

    await expect
      .element(page.getByRole('link', { name: 'Sign in with SSO →' }))
      .toHaveAttribute('href', SIGNIN_URL);
    await expect(authScreen.passwordInput()).toHaveCount(0);
    await expect(authScreen.signInButton()).toHaveCount(0);
  },
);

it('labels the link from the site', async () => {
  fakeSetupStatus();
  await renderAdminApp(
    '/signin',
    signedOutWithSSO({ sso_signin_url: SIGNIN_URL, sso_signin_label: 'Sign in with Example →' }),
  );

  await expect
    .element(page.getByRole('link', { name: 'Sign in with Example →' }))
    .toHaveAttribute('href', SIGNIN_URL);
});

it('still sends a site that is not set up to setup', async () => {
  fakeSetupStatus({ status: false });
  await renderAdminApp('/setup', signedOutWithSSO({ sso_signin_url: SIGNIN_URL }));

  await expect.element(authScreen.siteTitleInput()).toBeVisible();
});
