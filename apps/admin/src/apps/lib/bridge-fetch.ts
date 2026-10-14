import {
  type FetchRequest,
  type FetchResponse,
  checkAdminApiPath,
} from '@tryghost/app-contracts/bridge';
import { ghostApiRequestHeaders, handleSessionExpiry } from '@tryghost/admin-x-framework/helpers';
import { BridgeError } from './bridge-error';

export type AdminApiFetch = (request: FetchRequest, signal: AbortSignal) => Promise<FetchResponse>;

/**
 * Makes the requests an app asks for, to the Admin API under `apiRoot` and nowhere else.
 * `request` is already validated, a header only Admin sets included; where its path leads
 * is checked here. A path that leaves the API, or one the blocklist closes, is refused
 * before anything reaches the network.
 */
export function createAdminApiFetch({
  apiRoot,
  ghostVersion,
}: {
  /** The Admin API's root URL, as Admin's own requests use it. */
  apiRoot: URL;
  ghostVersion?: string;
}): AdminApiFetch {
  return async (request, signal) => {
    const check = checkAdminApiPath(request.path, apiRoot);
    if (check.problem === 'invalid_path') {
      throw new BridgeError('invalid_path', 'Expected an Admin API path within the Admin API');
    }
    if (check.problem === 'blocked') {
      throw new BridgeError('blocked', `Apps can’t use ${check.pathname}`);
    }
    const { url } = check;

    const appHeaders = Object.fromEntries(
      Object.entries(request.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
    );

    let response: Response;
    try {
      // eslint-disable-next-line no-restricted-syntax -- a raw request, answered to the app as it is
      response = await fetch(url, {
        method: request.method ?? 'GET',
        headers: { ...ghostApiRequestHeaders({ ghostVersion, body: request.body }), ...appHeaders },
        body: request.body,
        // The staff user's own session goes with the request. It stands in for the
        // app-scoped token that comes with Permissions and auth, and the blocklist above
        // goes with it: until then, it is what keeps the session's keys from the app.
        credentials: 'include',
        // A redirect could lead off the API, where the app's path would no longer say
        // where the request went. The Admin API answers none an app needs.
        redirect: 'error',
        signal,
      });
    } catch (error) {
      if (signal.aborted) {
        throw new BridgeError('session_ended', 'The app’s session ended');
      }
      throw new BridgeError('network_error', `Couldn’t reach the Admin API: ${String(error)}`);
    }

    // The staff user's session expiring shows up here as anywhere else in Admin, which
    // leaves for sign-in. The app gets its answer all the same.
    await handleSessionExpiry(url, response);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    };
  };
}
