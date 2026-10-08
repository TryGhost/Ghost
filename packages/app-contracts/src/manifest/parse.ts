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
  | {
      success: true;
      manifest: AppManifest;
      /**
       * The manifest's URL as it was checked, which is the one to keep: the URL parser
       * trims and normalises what it is given, so the string handed in may differ.
       */
      manifestUrl: string;
    }
  | { success: false; errors: ManifestError[] };

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((result, part) => {
    if (typeof part === 'number') {
      return `${result}[${part}]`;
    }
    return result ? `${result}.${String(part)}` : String(part);
  }, '');
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
  const ghostOrigins = new Set(
    options.ghostUrls.map((url) => (URL.canParse(url) ? new URL(url).origin : null)),
  );
  if (ghostOrigins.size === 0 || ghostOrigins.has(null)) {
    return {
      success: false,
      errors: [{ path: '', message: 'Expected the URLs Ghost itself is served from' }],
    };
  }

  let base: URL;
  try {
    base = new URL(options.manifestUrl);
  } catch {
    return { success: false, errors: [{ path: '', message: 'Expected the manifest at a URL' }] };
  }
  const baseProblem = checkResolvedUrl(base, allowLocalhost);
  if (baseProblem) {
    return {
      success: false,
      errors: [{ path: '', message: `${baseProblem} for the manifest itself` }],
    };
  }

  const result = manifestSchema({ base, ghostOrigins, allowLocalhost }).safeParse(input);
  if (result.success) {
    return { success: true, manifest: result.data, manifestUrl: base.href };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: formatPath(issue.path),
      message: issue.message,
    })),
  };
}
