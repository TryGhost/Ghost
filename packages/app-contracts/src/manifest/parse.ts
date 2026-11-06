import { hostOf, isGhostHost } from './ghost-host.ts';
import { isLocalhost } from './localhost.ts';
import { manifestSchema } from './schema.ts';
import type { AppManifest } from './types.ts';
import { checkResolvedUrl, FRAGMENT_PROBLEM, hasFragment } from './url.ts';

export interface ParseManifestOptions {
  /**
   * The address Ghost was asked to fetch the manifest from, before any redirects. The
   * manifest must name exactly this as its `manifest_url`, and its paths resolve against it.
   */
  manifestUrl: string;
  /**
   * The URLs Ghost itself is served from: the site and Admin. The manifest may not be on
   * their hosts, on any port, and so neither may anything Ghost loads from it, as that is
   * on the manifest's origin. A surface on Ghost's origin would share it with Admin, so its
   * sandbox would not contain it. On another port, the app would be sent the staff user's
   * session cookie, which browsers send to every port on a host.
   */
  ghostUrls: string[];
  /** Accept `localhost` addresses, over HTTP too. Only for Ghost in development. */
  allowLocalhost?: boolean;
}

export interface ManifestError {
  /** Where in the manifest the problem is, e.g. `surfaces[0].url`. Empty for the whole. */
  path: string;
  message: string;
}

/** A manifest's problems as text, each as `path: message`, joined by `separator`. */
export function formatManifestErrors(errors: readonly ManifestError[], separator: string): string {
  return errors
    .map(({ path, message }) => (path ? `${path}: ${message}` : message))
    .join(separator);
}

/**
 * - `invalid`: the manifest breaks the format's rules.
 * - `manifest_url_mismatch`: a valid manifest that names another address as its
 *   `manifest_url`, so it was copied, moved without being signed again, or is for another
 *   address on the same app.
 */
export type ParseManifestResult =
  | { success: true; manifest: AppManifest }
  | { success: false; reason: 'invalid' | 'manifest_url_mismatch'; errors: ManifestError[] };

export type ParseManifestUrlResult =
  | {
      success: true;
      /**
       * The address to keep, as the URL parser reads it. The URL parser trims and
       * normalises what it is given, so the string handed in may differ.
       */
      manifestUrl: string;
    }
  | { success: false; error: string };

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((result, part) => {
    if (typeof part === 'number') {
      return `${result}[${part}]`;
    }
    return result ? `${result}.${String(part)}` : String(part);
  }, '');
}

const GHOST_URLS_PROBLEM = 'Expected the URLs Ghost itself is served from';
const ON_GHOST_HOST =
  'Expected the manifest on a host other than the one Ghost itself is served from, on any port, as browsers send Ghost’s cookies to every port on its host';

const ON_GHOST_HOST_LOCALLY = `${ON_GHOST_HOST}. To run the app on this machine too, serve it from a name of its own under .localhost, such as my-app.localhost`;

/**
 * Why a manifest on one of Ghost's hosts is refused, with a hint for when that's most
 * likely: an app run next to Ghost on the developer's machine. A name under `.localhost`
 * is a host of its own, which browsers send to the machine itself, and so does Ghost in
 * development, whatever the system's resolver knows.
 */
function onGhostHost(url: URL): string {
  return isLocalhost(url.hostname) ? ON_GHOST_HOST_LOCALLY : ON_GHOST_HOST;
}

/**
 * Reads the address a manifest is to be read from, by the same rules as the URLs inside
 * it, and checks it is on none of Ghost's hosts. Run it before fetching, so the first
 * request never goes to an address Ghost would refuse (plain HTTP, one carrying
 * credentials, or one on Ghost's host). It cannot judge where that address redirects,
 * which is for whatever fetches it to limit.
 *
 * The address it hands back is the one to store, to compare with a later one, and that the
 * manifest must name as its `manifest_url`. The URL parser settles most differences in
 * spelling, but not a trailing dot on the host or the case of a percent-encoding: an address spelled that way reads as a
 * change of manifest URL, which needs the publisher's approval, the safe way to be wrong.
 */
export function parseManifestUrl(
  input: string,
  { ghostUrls, allowLocalhost = false }: Omit<ParseManifestOptions, 'manifestUrl'>,
): ParseManifestUrlResult {
  if (ghostUrls.length === 0 || !ghostUrls.every((ghostUrl) => hostOf(ghostUrl) !== null)) {
    return { success: false, error: GHOST_URLS_PROBLEM };
  }
  const url = URL.parse(input);
  if (!url) {
    return { success: false, error: 'Expected the manifest at a URL' };
  }
  const problem = hasFragment(input) ? FRAGMENT_PROBLEM : checkResolvedUrl(url, allowLocalhost);
  if (problem) {
    return { success: false, error: `${problem} for the manifest itself` };
  }
  if (isGhostHost(url, ghostUrls)) {
    return { success: false, error: onGhostHost(url) };
  }
  return { success: true, manifestUrl: url.href };
}

function invalid(errors: ManifestError[]): ParseManifestResult {
  return { success: false, reason: 'invalid', errors };
}

/**
 * Validates a manifest, and checks it names the address it was fetched from as its
 * `manifest_url`. A copy served from anywhere else is refused, so the signature binds the
 * manifest to its address as well as to every URL in it.
 *
 * Returns either the manifest, or every problem found. It does not fetch anything and it
 * never throws. Without the URLs Ghost is served from it rejects every manifest, since the
 * rule that keeps apps off Ghost's hosts could not be checked.
 */
export function parseManifest(input: unknown, options: ParseManifestOptions): ParseManifestResult {
  const allowLocalhost = options.allowLocalhost ?? false;
  const address = parseManifestUrl(options.manifestUrl, options);
  if (!address.success) {
    return invalid([{ path: '', message: address.error }]);
  }

  const result = manifestSchema({ allowLocalhost, base: address.manifestUrl }).safeParse(input);
  if (!result.success) {
    return invalid(
      result.error.issues.map((issue) => ({
        path: formatPath(issue.path),
        message: issue.message,
      })),
    );
  }
  if (result.data.manifest_url !== address.manifestUrl) {
    return {
      success: false,
      reason: 'manifest_url_mismatch',
      errors: [
        {
          path: 'manifest_url',
          message: `Expected ${address.manifestUrl}, the address the manifest was read from`,
        },
      ],
    };
  }
  return { success: true, manifest: result.data };
}
