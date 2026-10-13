import {
  type FetchRequest,
  type FetchResponse,
  isBlockedAdminApiPath,
  resolveAdminApiPath,
} from '@tryghost/app-contracts/bridge';
import { ghostApiRequestHeaders } from '@tryghost/admin-x-framework/helpers';
import { BridgeError } from './bridge-error';

/**
 * Headers an app may not set on a request Admin makes for it: the credentials, which are
 * Admin's to send, Admin's own markers, which Ghost reads as Admin speaking, and the ones
 * that describe the connection rather than the request. The browser refuses some of these
 * anyway; they're named so none of them depends on that.
 */
const STRIPPED_HEADER =
  /^(?:cookie|authorization|x-ghost-.*|app-pragma|host|origin|referer|content-length)$/i;

export type AdminApiFetch = (request: FetchRequest, signal: AbortSignal) => Promise<FetchResponse>;

/**
 * Makes the requests an app asks for, to the Admin API under `apiRoot` and nowhere else.
 * `request` is already validated; what it names is checked here. A path that leaves the
 * API, or one the blocklist closes, is refused before anything reaches the network.
 */
export function createAdminApiFetch({
  apiRoot,
  ghostVersion,
}: {
  /** The Admin API's root URL, ending in `/`, as Admin's own requests use it. */
  apiRoot: URL;
  ghostVersion?: string;
}): AdminApiFetch {
  return async (request, signal) => {
    const url = resolveAdminApiPath(request.path, apiRoot);
    if (!url) {
      throw new BridgeError('invalid_path', 'Expected an Admin API path within the Admin API');
    }
    // The path relative to the API root, as the blocklist reads it, keeping its leading `/`.
    const pathname = url.pathname.slice(apiRoot.pathname.length - 1);
    if (isBlockedAdminApiPath(pathname)) {
      throw new BridgeError('blocked', `Apps can’t use ${pathname}`);
    }

    const appHeaders = Object.fromEntries(
      Object.entries(request.headers ?? {})
        .filter(([name]) => !STRIPPED_HEADER.test(name))
        .map(([name, value]) => [name.toLowerCase(), value]),
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

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    };
  };
}
