import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import { isLocalhost } from '@tryghost/app-contracts/manifest';
import type { Got, PlainResponse } from 'got';

// The manifest is stored in a TEXT column, so anything larger could not be kept anyway.
const MANIFEST_MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

interface FetchedManifest {
  /**
   * Where the manifest was finally read from, after any redirects on the same host. Its
   * relative URLs resolve against this, as they would in a browser.
   */
  url: string;
  body: unknown;
}

type FetchManifest = (manifestUrl: string) => Promise<FetchedManifest>;

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

// Says only that the app answered with an error status, never why any other request
// failed, so the preview can't be used to probe the server's network. The reason is
// logged, so an operator can still tell a timeout from a certificate problem.
function unreachable(manifestUrl: string, err: unknown, logging: Pick<GhostLogger, 'warn'>) {
  const status = statusOf(err);
  logging.warn(`Could not load the app manifest at ${manifestUrl}`);
  logging.warn(err);
  return new errors.ValidationError({
    message: 'Could not load the app’s manifest.',
    code: 'APP_MANIFEST_UNREACHABLE',
    context: status ? `${manifestUrl} answered with HTTP ${status}` : manifestUrl,
  });
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
 * Fetches an app's manifest server-side, through the outbound request guard, so a
 * manifest is never taken from the browser.
 *
 * Redirects to another host are refused: the publisher reviews an app by its install
 * link's URL, so the manifest must come from that host. Each hop is checked against the
 * previous one, so an upgrade to HTTPS can't be followed by a downgrade.
 *
 * `getLocalhostAlias` is for running Ghost in a container in development, where
 * `localhost` is the container rather than the developer's machine. Localhost URLs (by
 * the manifest's rule) are fetched through the alias (e.g. `host.docker.internal`) with
 * the original Host header. The manifest's own URLs aren't changed, since the browser
 * uses them as they are.
 */
export function createManifestFetcher({
  request,
  logging,
  getLocalhostAlias,
}: {
  request: Got;
  logging: Pick<GhostLogger, 'warn'>;
  getLocalhostAlias: () => string | null;
}): FetchManifest {
  return async function fetchManifest(manifestUrl) {
    const alias = getLocalhostAlias();
    // The URL being fetched now, as the browser would see it (without the alias).
    let current = new URL(manifestUrl);

    const isAliased = (url: URL) => alias !== null && isLocalhost(url.hostname);
    const fetchUrl = (url: URL) => {
      if (!isAliased(url)) {
        return url;
      }
      const aliased = new URL(url.href);
      aliased.hostname = alias!;
      return aliased;
    };
    const hostHeader = (url: URL) => (isAliased(url) ? { host: url.host } : {});

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
      headers: { accept: 'application/json', ...hostHeader(current) },
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
      // as a refused redirect; a Location on a manifest or an error page is ignored.
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
      if (transferred > MANIFEST_MAX_BYTES || (total ?? 0) > MANIFEST_MAX_BYTES) {
        tooLarge = true;
        abort.abort();
      }
    });

    // got decodes the body as UTF-8 whatever charset the response names, which is what
    // JSON should use. The size limit above still applies, because it counts downloaded
    // bytes.
    let text: string;
    try {
      text = await pending.text();
    } catch (err) {
      if (refusedRedirect) {
        throw refused(manifestUrl, refusedRedirect, logging);
      }
      // Only a manifest is held to the size limit; a large error page is still reported
      // with its status. The status isn't known until the headers arrive, so the download
      // is stopped first and the two cases are told apart here.
      const status = statusOf(err);
      if (tooLarge && (status === undefined || (status >= 200 && status < 300))) {
        throw new errors.ValidationError({
          message: `The app’s manifest is larger than ${MANIFEST_MAX_BYTES / 1024} KB.`,
          code: 'APP_MANIFEST_TOO_LARGE',
          context: manifestUrl,
        });
      }
      throw unreachable(manifestUrl, err, logging);
    }
    if (refusedRedirect) {
      throw refused(manifestUrl, refusedRedirect, logging);
    }

    // A byte order mark is valid at the start of a JSON file, but JSON.parse rejects it.
    try {
      return {
        url: current.href,
        body: JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text),
      };
    } catch {
      throw new errors.ValidationError({
        message: 'The app’s manifest is not JSON.',
        code: 'APP_MANIFEST_NOT_JSON',
        context: manifestUrl,
      });
    }
  };
}

function refused(
  manifestUrl: string,
  { status, target }: { status: number; target: URL | null },
  logging: Pick<GhostLogger, 'warn'>,
) {
  if (!target) {
    // Reported as unreachable, so logged like every other unreachable manifest.
    const context = `${manifestUrl} answered with HTTP ${status} and a Location that is not a URL`;
    logging.warn(`Could not load the app manifest at ${manifestUrl}`);
    logging.warn(context);
    return new errors.ValidationError({
      message: 'Could not load the app’s manifest.',
      code: 'APP_MANIFEST_UNREACHABLE',
      context,
    });
  }
  return new errors.ValidationError({
    message: 'The app’s manifest redirects to another host.',
    code: 'APP_MANIFEST_REDIRECTED',
    context: `${manifestUrl} redirects to ${target.host}`,
  });
}
