import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { isLocalhost } from '@tryghost/app-contracts/manifest';
import type { Got } from 'got';

// The manifest is stored in a TEXT column, so anything larger could not be kept anyway.
export const MANIFEST_MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

export interface FetchedManifest {
  /**
   * Where the manifest was finally read from, after any redirects on the same host. Its
   * relative URLs resolve against this, as they would in a browser.
   */
  url: string;
  body: unknown;
}

export type FetchManifest = (manifestUrl: string) => Promise<FetchedManifest>;

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

// Says only that the app answered with an error, never why a request failed otherwise, so
// the preview cannot be used to map the network Ghost runs in. The reason is logged, so an
// operator can still tell a timeout from a certificate problem.
function unreachable(manifestUrl: string, err: unknown) {
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
 * Fetches an app's manifest on the server, through the outbound request guard, so a
 * manifest Ghost acts on never comes from the browser.
 *
 * A redirect to another host is refused: the publisher reviews an app by where its
 * install link points, and the manifest must come from there. Each hop is judged against
 * the one before it, so an upgrade to HTTPS cannot be followed by a step back down.
 *
 * `getLocalhostAlias` is for Ghost running in a container in development. There `localhost`
 * is the container, not the developer's machine where the app runs, so a localhost address
 * (by the same rule the manifest uses) is fetched through the alias (e.g.
 * `host.docker.internal`) with the original Host header. The manifest keeps its own URLs,
 * which the browser still uses as they are.
 */
export function createManifestFetcher({
  request,
  getLocalhostAlias,
}: {
  request: Got;
  getLocalhostAlias: () => string | null;
}): FetchManifest {
  return async function fetchManifest(manifestUrl) {
    const alias = getLocalhostAlias();
    // Where the manifest is being read from now, by the address the browser would use.
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

    let refusedRedirect: URL | undefined;
    let tooLarge = false;
    const abort = new AbortController();

    const pending = request(fetchUrl(current), {
      headers: { accept: 'application/json', ...hostHeader(current) },
      retry: { limit: 0 },
      maxRedirects: MAX_REDIRECTS,
      // One deadline for the whole fetch, redirects included: got's own timeout starts
      // over on every hop, which would let a slow app hold a preview for several times
      // as long.
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      // Decided here rather than in a redirect hook: got asks this before any hook runs,
      // so a redirect to another host is refused before the outbound guard looks its
      // target up, and Ghost never resolves a host it was always going to refuse.
      followRedirect: (response) => {
        // got asks on every response, a plain 200 included, not only on redirects.
        const rawLocation = response.headers.location;
        if (!rawLocation) {
          return true;
        }
        // Headers arrive as latin1; got reads the location as UTF-8, and so does this.
        const location = Buffer.from(rawLocation, 'binary').toString('utf8');
        const target = new URL(location, response.url);
        // Undo the alias, so the redirect is judged by where the browser would go.
        if (isAliased(current) && target.hostname === alias) {
          target.hostname = current.hostname;
        }
        if (!staysOnHost(current, target)) {
          refusedRedirect = target;
          return false;
        }
        current = target;
        return true;
      },
      hooks: {
        beforeRedirect: [
          (options) => {
            // Only an aliased hop needs its address rewritten; everywhere else got's own
            // reading of the redirect stands.
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

    // got decodes the body as UTF-8 whatever the response says, which is what JSON is
    // expected in. The size limit above still applies, as it watches the download rather
    // than the result.
    let text: string;
    try {
      text = await pending.text();
    } catch (err) {
      if (refusedRedirect) {
        throw redirected(manifestUrl, refusedRedirect);
      }
      // Only a manifest is held to the limit: a large error page is still an error page,
      // reported with its status. The status is only known once the headers are in, so
      // the download is stopped first and told apart here.
      const status = statusOf(err);
      if (tooLarge && (status === undefined || (status >= 200 && status < 300))) {
        throw new errors.ValidationError({
          message: `The app’s manifest is larger than ${MANIFEST_MAX_BYTES / 1024} KB.`,
          code: 'APP_MANIFEST_TOO_LARGE',
          context: manifestUrl,
        });
      }
      throw unreachable(manifestUrl, err);
    }
    if (refusedRedirect) {
      throw redirected(manifestUrl, refusedRedirect);
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

function redirected(manifestUrl: string, target: URL) {
  return new errors.ValidationError({
    message: 'The app’s manifest redirects to another host.',
    code: 'APP_MANIFEST_REDIRECTED',
    context: `${manifestUrl} redirects to ${target.host}`,
  });
}
