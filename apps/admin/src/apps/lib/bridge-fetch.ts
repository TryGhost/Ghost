import type { AppPermissionKey } from '@tryghost/app-contracts';
import {
  type FetchRequest,
  type FetchResponse,
  checkAdminApiRequest,
  isReservedRequestHeader,
} from '@tryghost/app-contracts/bridge';
import { ghostApiRequestHeaders, handleSessionExpiry } from '@tryghost/admin-x-framework/helpers';
import type { AppTokenSource } from './app-token';
import { BridgeError, sessionEnded } from './bridge-error';

export type AdminApiFetch = (request: FetchRequest, signal: AbortSignal) => Promise<FetchResponse>;

/**
 * Sends the requests an app asks for, only to the Admin API under `apiRoot`. `request` is already
 * validated. This function checks where its path leads and what it sends, and refuses a path that
 * leaves the API, or a request the allowlist doesn't allow or that needs a scope the installation
 * wasn't approved for, before anything reaches the network.
 * It also drops headers that only Admin sets, so none of the app's headers can replace Admin's,
 * whatever reaches this function.
 *
 * Requests carry the app session's token, never the staff session cookie; `token` decides which
 * token a call is sent with, and sends it again when the token was refused.
 */
export function createAdminApiFetch({
  apiRoot,
  approvedScopes,
  ghostVersion,
  token,
}: {
  /** The Admin API's root URL, as Admin's own requests use it. */
  apiRoot: URL;
  /** The scopes in the approved manifest the app session is pinned to. */
  approvedScopes: ReadonlySet<AppPermissionKey>;
  ghostVersion?: string;
  /** The app session's token, which the app's frame never sees. */
  token: AppTokenSource;
}): AdminApiFetch {
  return async (request, signal) => {
    const method = request.method ?? 'GET';
    const check = checkAdminApiRequest(request, apiRoot, approvedScopes);
    if (check.problem === 'invalid_path') {
      throw new BridgeError('invalid_path', 'Expected an Admin API path within the Admin API');
    }
    if (check.problem === 'blocked') {
      throw new BridgeError('blocked', check.detail);
    }
    const { url } = check;

    const appHeaders = Object.fromEntries(
      Object.entries(request.headers ?? {})
        .filter(([name]) => !isReservedRequestHeader(name))
        .map(([name, value]) => [name.toLowerCase(), value]),
    );

    // A request aborted because the session ended is refused like every other call after the
    // session ends. Any other failure is a network error.
    const failed = (what: string, error: unknown) =>
      signal.aborted
        ? sessionEnded()
        : new BridgeError('network_error', `${what}: ${String(error)}`);

    const send = (sentToken: string) =>
      // eslint-disable-next-line no-restricted-syntax -- a raw request, returned to the app as is
      fetch(url, {
        method,
        headers: {
          ...ghostApiRequestHeaders({ ghostVersion, body: request.body }),
          ...appHeaders,
          authorization: `Bearer ${sentToken}`,
        },
        body: request.body,
        // The token is the request's only credential, which Ghost holds to the approved scopes.
        credentials: 'omit',
        // A redirect could lead off the API, where the app's path would no longer show where the
        // request went, so no redirect is followed. Most Admin API redirects are for a path missing
        // its trailing `/`, which the app can fix.
        redirect: 'manual',
        signal,
      });

    let response: Response;
    try {
      response = await token.send(send);
    } catch (error) {
      throw failed('Couldn’t reach the Admin API', error);
    }

    if (response.type === 'opaqueredirect') {
      // A path that ends in `/` is correct, so the redirect is intentional.
      throw new BridgeError(
        'invalid_path',
        check.pathname.endsWith('/')
          ? `The Admin API answers ${check.pathname} with a redirect, which apps can’t follow`
          : `The Admin API answers ${check.pathname} only with a redirect: its paths end in /, such as ${check.pathname}/`,
      );
    }

    // An expired staff session is handled here the same way as anywhere else in Admin. Admin leaves
    // for sign-in only once Ghost confirms the session expired, because an app can trigger an
    // unauthorized response on purpose. The app still gets the response.
    await handleSessionExpiry(url, response);

    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      throw failed('Couldn’t read the Admin API’s answer', error);
    }
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body,
    };
  };
}
