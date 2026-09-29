import { siteResponse } from '@tryghost/test-data';
import type { RenderAdminAppOptions } from './render-admin-app';
import { type EndpointCapture, fakeAdminEndpoint } from './worker';

const authorizationFailed = {
  errors: [
    {
      type: 'NoPermissionError',
      message: 'Authorization failed',
      context:
        'Unable to determine the authenticated user or integration. Check that cookies are being passed through if using session authentication.',
    },
  ],
};

/**
 * Boots as a visitor with no session: Core answers every signed-in read with
 * 403 "Authorization failed". `authReact` is the public site field that hands
 * the auth screens to React; leave it out to boot against a server that
 * predates it.
 */
export function signedOut({ authReact }: { authReact?: boolean } = {}): RenderAdminAppOptions {
  const site = siteResponse();
  const forbidden = { response: authorizationFailed, responseStatus: 403 };

  return {
    boot: {
      browseMe: forbidden,
      browseSettings: forbidden,
      browseConfig: forbidden,
      browseSite: {
        response: authReact === undefined ? site : { site: { ...site.site, authReact } },
      },
    },
  };
}

/** The setup check every signed-out auth screen makes; set-up sites by default. */
export function fakeSetupStatus(
  setup: { status: boolean; title?: string; name?: string; email?: string } = { status: true },
): EndpointCapture {
  return fakeAdminEndpoint('GET', '/authentication/setup/', { setup: [setup] });
}

/** The session endpoints answer with bare status text rather than JSON. */
export function plainText(body: string): ArrayBuffer {
  return new TextEncoder().encode(body).buffer;
}

/** A base64url invite or reset token carrying `email`, shaped like Core's `expiry|email|hash`. */
export function authToken(email: string): string {
  return window
    .btoa(`${Date.now() + 86_400_000}|${email}|hash`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
