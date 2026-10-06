import errors from '@tryghost/errors';
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

// Says only that the app answered with an error, never why a request failed otherwise, so
// the preview cannot be used to map the network Ghost runs in.
function unreachable(manifestUrl: string, err: unknown) {
  const status = (err as { response?: { statusCode?: number } } | null)?.response?.statusCode;
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
 * install link points, and the manifest must come from there.
 *
 * `getLocalhostAlias` is for Ghost running in a container in development. There `localhost`
 * is the container, not the developer's machine where the app runs, so a localhost
 * address (by the same rule the manifest uses) is fetched through the alias (e.g. `host.docker.internal`) with the original
 * Host header. The manifest keeps its own URLs, which the browser still uses as they are.
 */
export function createManifestFetcher({
  request,
  getLocalhostAlias,
}: {
  request: Got;
  getLocalhostAlias: () => string | null;
}): FetchManifest {
  return async function fetchManifest(manifestUrl) {
    const requested = new URL(manifestUrl);
    const alias = getLocalhostAlias();
    let current = requested;

    const fetchUrl = (url: URL) => {
      if (!alias || !isLocalhost(url.hostname)) {
        return url;
      }
      const aliased = new URL(url.href);
      aliased.hostname = alias;
      return aliased;
    };
    const hostHeader = (url: URL) => (fetchUrl(url) === url ? {} : { host: url.host });

    let refusedRedirect: URL | undefined;
    let tooLarge = false;
    const abort = new AbortController();

    const pending = request(fetchUrl(requested), {
      headers: { accept: 'application/json', ...hostHeader(requested) },
      timeout: { request: TIMEOUT_MS },
      retry: { limit: 0 },
      maxRedirects: MAX_REDIRECTS,
      signal: abort.signal,
      hooks: {
        beforeRedirect: [
          (options) => {
            const target = new URL(String(options.url));
            // Undo the alias, so the redirect is judged by where the browser would go.
            if (fetchUrl(requested) !== requested && target.hostname === alias) {
              target.hostname = requested.hostname;
            }
            if (!staysOnHost(requested, target)) {
              refusedRedirect = target;
              throw new errors.InternalServerError({ message: 'Redirected to another host' });
            }
            current = target;
            options.url = fetchUrl(target);
            Object.assign(options.headers, hostHeader(target));
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

    let body: Buffer;
    try {
      body = Buffer.from(await pending.buffer());
    } catch (err) {
      if (refusedRedirect) {
        throw new errors.ValidationError({
          message: 'The app’s manifest redirects to another host.',
          code: 'APP_MANIFEST_REDIRECTED',
          context: `${manifestUrl} redirects to ${refusedRedirect.host}`,
        });
      }
      if (tooLarge) {
        throw new errors.ValidationError({
          message: `The app’s manifest is larger than ${MANIFEST_MAX_BYTES / 1024} KB.`,
          code: 'APP_MANIFEST_TOO_LARGE',
          context: manifestUrl,
        });
      }
      throw unreachable(manifestUrl, err);
    }

    // A byte order mark is valid at the start of a JSON file, but JSON.parse rejects it.
    const text = body.toString('utf8');
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
