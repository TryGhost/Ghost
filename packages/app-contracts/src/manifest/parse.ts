import { manifestSchema, type AppManifest } from './schema.ts';
import { checkResolvedUrl } from './url.ts';

export interface ParseManifestOptions {
  /** The URL the manifest was fetched from. Relative URLs in it resolve against this. */
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

type CheckedManifestUrl = { url: URL; problem: null } | { url: null; problem: string };

/** The address a manifest is read from, checked by the same rules as the URLs in it. */
function checkManifestUrl(url: URL | null, allowLocalhost: boolean): CheckedManifestUrl {
  if (!url) {
    return { url: null, problem: 'Expected the manifest at a URL' };
  }
  const problem = checkResolvedUrl(url, allowLocalhost);
  return problem
    ? { url: null, problem: `${problem} for the manifest itself` }
    : { url, problem: null };
}

/**
 * Reads the address a manifest is to be read from, by the same rules as the URLs inside
 * it. Run it before fetching, so Ghost never requests an address it would refuse anyway
 * (plain HTTP, or one carrying credentials).
 *
 * The address it hands back is the one to keep: what is stored, fetched again later and
 * compared with a later address, so each address has one spelling. A fragment never
 * reaches the server, so two addresses that differ only there read the same file: it is
 * no part of the address, and is left out before the address is checked, its length
 * included.
 */
export function parseManifestUrl(input: string, allowLocalhost = false): ParseManifestUrlResult {
  const address = URL.parse(input);
  if (address) {
    address.hash = '';
  }
  const { url, problem } = checkManifestUrl(address, allowLocalhost);
  if (problem !== null) {
    return { success: false, error: problem };
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
  const ghostOrigins = new Set(options.ghostUrls.map((url) => URL.parse(url)?.origin ?? null));
  if (ghostOrigins.size === 0 || ghostOrigins.has(null)) {
    return {
      success: false,
      errors: [{ path: '', message: 'Expected the URLs Ghost itself is served from' }],
    };
  }

  const { url: base, problem } = checkManifestUrl(URL.parse(options.manifestUrl), allowLocalhost);
  if (problem !== null) {
    return { success: false, errors: [{ path: '', message: problem }] };
  }

  const result = manifestSchema({ base, ghostOrigins, allowLocalhost }).safeParse(input);
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
