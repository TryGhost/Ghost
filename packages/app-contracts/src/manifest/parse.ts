import { manifestSchema, type AppManifest } from './schema.ts';
import { checkResolvedUrl } from './url.ts';

export interface ParseManifestOptions {
  /**
   * Where the manifest was fetched from, after any redirects. Relative URLs in it resolve
   * against this, as they would in a browser.
   */
  manifestUrl: string;
  /**
   * The URLs Ghost itself is served from: the site and Admin. Nothing Ghost loads from a
   * manifest may point at these origins. A surface there would share an origin with Admin,
   * so its sandbox would not contain it, and an icon there would make Admin request a
   * Ghost URL of the app's choosing with the staff user's session.
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

export type ParseManifestResult =
  | { success: true; manifest: AppManifest }
  | { success: false; errors: ManifestError[] };

export type ParseManifestUrlResult =
  | {
      success: true;
      /**
       * The address to keep, as the URL parser reads it and without a fragment. The URL
       * parser trims and normalises what it is given, so the string handed in may differ.
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

/**
 * Reads the address a manifest is to be read from, by the same rules as the URLs inside
 * it. Run it before fetching, so the first request never goes to an address Ghost would
 * refuse (plain HTTP, or one carrying credentials). It cannot judge where that address
 * redirects: `parseManifest` checks the address the manifest was finally read from.
 *
 * A fragment never reaches the server, so it is no part of the address and is left out
 * before the check, its length included. That goes for the address a redirect ends at
 * too, which can carry a fragment of any length; URLs in the manifest resolve against it
 * the same either way.
 *
 * The address it hands back, without a fragment, is the one to store and compare with a
 * later one. The URL parser settles most differences in spelling, but not a trailing dot
 * on the host or the case of a percent-encoding: an address spelled that way reads as a
 * change of manifest URL, which needs the publisher's approval, the safe way to be wrong.
 */
export function parseManifestUrl(input: string, allowLocalhost = false): ParseManifestUrlResult {
  const url = URL.parse(input);
  if (!url) {
    return { success: false, error: 'Expected the manifest at a URL' };
  }
  url.hash = '';
  const problem = checkResolvedUrl(url, allowLocalhost);
  if (problem) {
    return { success: false, error: `${problem} for the manifest itself` };
  }
  return { success: true, manifestUrl: url.href };
}

/**
 * Validates a manifest and resolves its URLs against where it was fetched from.
 *
 * Returns either the manifest with every URL absolute, or every problem found. It does
 * not fetch anything and it never throws. Without the URLs Ghost is served from it rejects
 * every manifest, since the rule that keeps apps off Ghost's origin could not be checked.
 */
export function parseManifest(input: unknown, options: ParseManifestOptions): ParseManifestResult {
  const allowLocalhost = options.allowLocalhost ?? false;
  const { ghostUrls } = options;
  if (ghostUrls.length === 0 || !ghostUrls.every((url) => URL.canParse(url))) {
    return {
      success: false,
      errors: [{ path: '', message: 'Expected the URLs Ghost itself is served from' }],
    };
  }

  const address = parseManifestUrl(options.manifestUrl, allowLocalhost);
  if (!address.success) {
    return { success: false, errors: [{ path: '', message: address.error }] };
  }
  const base = new URL(address.manifestUrl);

  const result = manifestSchema({ base, ghostUrls, allowLocalhost }).safeParse(input);
  if (result.success) {
    return { success: true, manifest: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: formatPath(issue.path),
      message: issue.message,
    })),
  };
}
