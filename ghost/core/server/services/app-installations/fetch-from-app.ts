import { isLocalhost } from '@tryghost/app-contracts/manifest';
import type { Got, PlainResponse } from 'got';

const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/**
 * Why an app's URL could not be read.
 *
 * - `unreachable`: the app answered with an error status, or didn't answer. `status` is
 *   the only part that may be shown, so a review can't be used to probe the server's
 *   network; `cause` is for the logs, so an operator can still tell a timeout from a
 *   certificate problem.
 * - `location_not_url`: a redirect whose Location isn't a URL.
 * - `redirected`: a redirect to another host, which is never followed.
 * - `too_large`: a successful response larger than `maxBytes`. A large error page is
 *   `unreachable` instead, with its status.
 */
export type AppFetchFailure =
  | { reason: 'unreachable'; status?: number; cause: unknown }
  | { reason: 'location_not_url'; status: number }
  | { reason: 'redirected'; host: string }
  | { reason: 'too_large' };

export type AppFetchResult =
  | {
      success: true;
      /** Where the text was finally read from, after any redirects on the same host. */
      url: string;
      text: string;
    }
  | { success: false; failure: AppFetchFailure };

export type FetchFromApp = (
  url: string,
  options: { accept: string; maxBytes: number },
) => Promise<AppFetchResult>;

/** The HTTP status the app answered with, if it answered at all. */
function statusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return undefined;
  }
  const { response } = err;
  if (typeof response !== 'object' || response === null || !('statusCode' in response)) {
    return undefined;
  }
  return typeof response.statusCode === 'number' ? response.statusCode : undefined;
}

/** A redirect may stay on the host it started on, or move it from HTTP to HTTPS. */
function staysOnHost(from: URL, to: URL): boolean {
  if (to.origin === from.origin) {
    return true;
  }
  return (
    from.protocol === 'http:' &&
    to.protocol === 'https:' &&
    to.hostname === from.hostname &&
    from.port === '' &&
    to.port === ''
  );
}

/**
 * Fetches a URL an app serves, server-side, through the outbound request guard.
 *
 * Redirects to another host are refused: the publisher reviews an app by its install
 * link's URL, so what it serves must come from that host. Each hop is checked against the
 * previous one, so an upgrade to HTTPS can't be followed by a downgrade.
 *
 * `getLocalhostAlias` is for running Ghost in a container in development, where
 * `localhost` is the container rather than the developer's machine. Localhost URLs (by
 * the manifest's rule) are fetched through the alias (e.g. `host.docker.internal`) with
 * the original Host header. The final URL is reported without the alias, as the browser
 * would see it.
 */
export function createAppFetcher({
  request,
  getLocalhostAlias,
}: {
  request: Got;
  getLocalhostAlias: () => string | null;
}): FetchFromApp {
  return async function fetchFromApp(url, { accept, maxBytes }) {
    const alias = getLocalhostAlias();
    // The URL being fetched now, as the browser would see it (without the alias).
    let current = new URL(url);

    const isAliased = (target: URL) => alias !== null && isLocalhost(target.hostname);
    const fetchUrl = (target: URL) => {
      if (!isAliased(target)) {
        return target;
      }
      const aliased = new URL(target.href);
      aliased.hostname = alias!;
      return aliased;
    };
    const hostHeader = (target: URL) => (isAliased(target) ? { host: target.host } : {});

    // A response's Location as the browser would see it: undefined if there's none, null
    // if it isn't a URL.
    const locationOf = (response: PlainResponse): URL | null | undefined => {
      const rawLocation = response.headers.location;
      if (!rawLocation) {
        return undefined;
      }
      // Headers arrive as latin1; got reads the location as UTF-8, and so does this.
      const target = URL.parse(Buffer.from(rawLocation, 'binary').toString('utf8'), response.url);
      // Undo the alias, so the redirect is checked against the URL the browser would use.
      if (target && isAliased(current) && target.hostname === alias) {
        target.hostname = current.hostname;
      }
      return target;
    };

    let refusedRedirect: { status: number; target: URL | null } | undefined;
    let tooLarge = false;
    const abort = new AbortController();

    const pending = request(fetchUrl(current), {
      headers: { accept, ...hostHeader(current) },
      retry: { limit: 0 },
      maxRedirects: MAX_REDIRECTS,
      // One deadline for the whole fetch, redirects included. got's own timeout restarts
      // on every hop, which would let a slow app stall a preview several times over.
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      // Checked here rather than in a redirect hook, because got calls this before any
      // hook. A redirect to another host is refused before the outbound guard resolves
      // it, so that host is never looked up.
      //
      // got calls this for every response, a 200 included, sometimes more than once for
      // the same one, so it has no side effects; `current` is updated in beforeRedirect. A
      // Location on another host, or one that isn't a URL, is never followed at any
      // status, so the rule holds whichever statuses got follows. Only a 3xx is reported
      // as a refused redirect; a Location on a successful response or an error page is
      // ignored.
      followRedirect: (response) => {
        const target = locationOf(response);
        if (target === undefined || (target && staysOnHost(current, target))) {
          return true;
        }
        if (response.statusCode >= 300 && response.statusCode < 400) {
          refusedRedirect = { status: response.statusCode, target };
        }
        return false;
      },
      hooks: {
        beforeRedirect: [
          (options, response) => {
            // got runs this once per redirect it follows, after followRedirect allowed it,
            // so the Location is a URL on the same host.
            const target = locationOf(response)!;
            // got drops credentials from a Location, as browsers do, so the tracked URL
            // drops them too.
            target.username = '';
            target.password = '';
            current = target;
            // Only an aliased hop needs its URL rewritten; otherwise got's own redirect
            // URL is used.
            if (isAliased(current)) {
              options.url = fetchUrl(current);
              Object.assign(options.headers, hostHeader(current));
            }
          },
        ],
      },
    });
    pending.on('downloadProgress', ({ transferred, total }) => {
      if (transferred > maxBytes || (total ?? 0) > maxBytes) {
        tooLarge = true;
        abort.abort();
      }
    });

    // got decodes the body as UTF-8 whatever charset the response names. The size limit
    // above still applies, because it counts downloaded bytes.
    let text: string;
    try {
      text = await pending.text();
    } catch (err) {
      if (refusedRedirect) {
        return { success: false, failure: refused(refusedRedirect) };
      }
      // Only a successful response is held to the size limit; a large error page is still
      // reported with its status. The status isn't known until the headers arrive, so the
      // download is stopped first and the two cases are told apart here.
      const status = statusOf(err);
      if (tooLarge && (status === undefined || (status >= 200 && status < 300))) {
        return { success: false, failure: { reason: 'too_large' } };
      }
      return { success: false, failure: { reason: 'unreachable', status, cause: err } };
    }
    if (refusedRedirect) {
      return { success: false, failure: refused(refusedRedirect) };
    }
    return { success: true, url: current.href, text };
  };
}

function refused({ status, target }: { status: number; target: URL | null }): AppFetchFailure {
  return target
    ? { reason: 'redirected', host: target.host }
    : { reason: 'location_not_url', status };
}
