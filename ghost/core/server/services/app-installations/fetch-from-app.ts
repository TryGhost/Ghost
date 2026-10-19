import { isLocalhost } from '@tryghost/app-contracts/manifest';
import type { Got, PlainResponse } from 'got';
import { z } from 'zod';

const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/**
 * Why an app's URL could not be read.
 *
 * - `unreachable`: the app answered with a status other than 2xx, didn't answer in full, or
 *   the URL isn't one. `status` is the status it answered with, and the only part that may
 *   be shown, so a review can't be used to probe the server's network; `cause` is for the
 *   logs, so an operator can still tell a timeout from a certificate problem.
 * - `location_not_url`: a redirect whose Location isn't a URL.
 * - `redirected`: a redirect to another host, which is never followed.
 * - `too_large`: a 2xx response larger than `maxBytes`. A large error page is `unreachable`
 *   instead, with its status.
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

const FailedRequest = z.object({
  code: z.unknown(),
  response: z.object({ statusCode: z.number() }),
});

// The errors got fails a request with when it won't take the response it got: a status
// other than 2xx, or a redirect past the limit.
const REFUSED_RESPONSE_CODES: ReadonlySet<unknown> = new Set([
  'ERR_NON_2XX_3XX_RESPONSE',
  'ERR_TOO_MANY_REDIRECTS',
]);

/**
 * The HTTP status a failed request ended on, if it ended on the app's answer. got attaches
 * the last response it saw to any error, which may be a redirect it was following when
 * the request failed, so that response only counts when got refused it, or when its
 * download was stopped for its size.
 */
function statusOf(err: unknown, { stoppedDownload }: { stoppedDownload: boolean }) {
  const failed = FailedRequest.safeParse(err).data;
  if (!failed || !(stoppedDownload || REFUSED_RESPONSE_CODES.has(failed.code))) {
    return undefined;
  }
  return failed.response.statusCode;
}

const isSuccess = (status: number) => status >= 200 && status < 300;

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
 * would see it. It is called on every fetch because it reads config.
 */
export function createAppFetcher({
  request,
  getLocalhostAlias,
}: {
  request: Got;
  getLocalhostAlias: () => string | null;
}): FetchFromApp {
  return async function fetchFromApp(url, { accept, maxBytes }) {
    const start = URL.parse(url);
    if (!start) {
      return {
        success: false,
        failure: { reason: 'unreachable', cause: `${url} is not a URL` },
      };
    }
    // got would send the credentials in the URL it starts from, though it drops a
    // redirect's. These are dropped too, so none are ever sent or reported.
    start.username = '';
    start.password = '';
    const alias = getLocalhostAlias();
    // The URL being fetched now, as the browser would see it (without the alias).
    let current = start;

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

    let refusedRedirect: AppFetchFailure | undefined;
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
          refusedRedirect = target
            ? { reason: 'redirected', host: target.host }
            : { reason: 'location_not_url', status: response.statusCode };
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
    let status: number;
    let text: string;
    try {
      status = (await pending).statusCode;
      // Decodes the response just read, as fetch's text() does; nothing is fetched again.
      text = await pending.text();
    } catch (err) {
      if (refusedRedirect) {
        return { success: false, failure: refusedRedirect };
      }
      // Only a 2xx response is held to the size limit; a large error page is still
      // reported with its status. The status isn't known until the headers arrive, so the
      // download is stopped first and the two cases are told apart here.
      const answered = statusOf(err, { stoppedDownload: tooLarge });
      if (tooLarge && (answered === undefined || isSuccess(answered))) {
        return { success: false, failure: { reason: 'too_large' } };
      }
      return { success: false, failure: { reason: 'unreachable', status: answered, cause: err } };
    }
    if (refusedRedirect) {
      return { success: false, failure: refusedRedirect };
    }
    // got resolves a 304 rather than failing it, but it is no more a read than a 404.
    if (!isSuccess(status)) {
      return {
        success: false,
        failure: {
          reason: 'unreachable',
          status,
          cause: `${current.href} answered with HTTP ${status}`,
        },
      };
    }
    return { success: true, url: current.href, text };
  };
}
