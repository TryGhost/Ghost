import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { page } from 'vitest/browser';
import { holdSessionExpiryRedirect } from '@tryghost/admin-x-framework/helpers';
import { renderAdminApp } from '@test-utils/acceptance';
import { reportAppsError } from './lib/report-error';
import { fakeAppPage, fakeInstallations, installation, labs } from './apps.test-utils';

vi.mock('./lib/report-error', () => ({ reportAppsError: vi.fn() }));

/** How Ghost refuses a request whose staff session expired. */
const sessionExpired = () =>
  new Response(
    JSON.stringify({ errors: [{ type: 'NoPermissionError', message: 'Authorization failed' }] }),
    { status: 403, headers: { 'content-type': 'application/json' } },
  );

describe('Opening an app once the staff session has expired', () => {
  it('leaves the publisher to sign in, without saying the app couldn’t load or reporting it', async () => {
    // Admin's sign-in redirect would take the test page away
    onTestFinished(holdSessionExpiryRedirect());
    fakeInstallations([installation()]);
    const { sessionsApi } = await fakeAppPage(installation());
    sessionsApi.set(sessionExpired());

    await renderAdminApp(`/apps/${installation().id}`, { labs });

    await expect.element(page.getByTestId('app-signing-in')).toBeInTheDocument();
    expect(sessionsApi.requests).toHaveLength(1);
    await expect
      .element(page.getByText('Couldn’t load this app. Please try again.'))
      .not.toBeInTheDocument();
    expect(reportAppsError).not.toHaveBeenCalled();
  });
});
