import { z } from 'zod';

/**
 * The app manifest: what an app tells Ghost about itself, and what a publisher agrees to
 * when installing it.
 *
 * Ghost core validates a manifest when it fetches one, and admin validates what it is
 * handed before acting on it. Both go through `parseManifest`, so they cannot disagree
 * about what a valid manifest is.
 *
 * The format is unversioned while only Ghost builds apps. Unknown fields are rejected at
 * every level, so an app cannot claim something Ghost has not designed, and adding a field
 * is always a deliberate change to this file.
 */

/** Matches the limit of the index that ties saved cards to an app. */
export const APP_ID_MAX_LENGTH = 191;

const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 200;
const AUTHOR_NAME_MAX_LENGTH = 50;
const ICON_NAME_MAX_LENGTH = 64;
const URL_MAX_LENGTH = 2000;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A parsed manifest. Every URL in it is absolute, and a surface's origin is the only one
 * allowed to talk to Ghost from that surface.
 */
export type AppManifest = z.output<ReturnType<typeof manifestSchema>>;

export type AppSurface = AppManifest['surfaces'][number];

export type AppSurfaceType = AppSurface['type'];

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

const ID_SEGMENT = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * An app ID is reverse-domain style: at least two dot-separated segments of lowercase
 * letters, digits and hyphens, starting with a letter so that an IP address or a version
 * number is not an ID. IDs are compared exactly, so an uppercase ID is invalid rather than
 * lowercased.
 */
export function isValidAppId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > APP_ID_MAX_LENGTH) {
    return false;
  }
  const segments = value.split('.');
  return (
    segments.length >= 2 &&
    /^[a-z]/.test(value) &&
    segments.every((segment) => ID_SEGMENT.test(segment))
  );
}

// `URL` has already normalised the host by the time these run: every spelling of an IPv4
// address is dotted decimal, and an IPv4-mapped IPv6 address is two hex groups.
const LOOPBACK_HOSTS = [
  /^localhost$/,
  /\.localhost$/,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/,
  /^\[::ffff:0:0\]$/,
];

/** Whether a host is the machine itself: `localhost`, or a loopback or unspecified address. */
function isLocalhost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '');
  return LOOPBACK_HOSTS.some((pattern) => pattern.test(host));
}

// Control characters, including line breaks, and the characters that reorder text. Both
// let a name read as something other than what it is on the consent screen.
const MISLEADING_CHARACTERS = /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

function isPlainText(value: string): boolean {
  return !MISLEADING_CHARACTERS.test(value);
}

/**
 * Checks a URL after it has been resolved, never before: a relative value can resolve to
 * another scheme or host, and only the result says what Ghost would load.
 */
function checkResolvedUrl(url: URL, allowLocalhost: boolean): string | null {
  if (url.username || url.password) {
    return 'Expected a URL without a username or password';
  }
  if (isLocalhost(url.hostname)) {
    if (!allowLocalhost) {
      return 'Expected a public address; localhost is only allowed when Ghost runs in development';
    }
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? null
      : 'Expected an http or https URL';
  }
  return url.protocol === 'https:' ? null : 'Expected an https URL';
}

interface UrlRules {
  base: URL;
  ghostOrigins: Set<string | null>;
  allowLocalhost: boolean;
}

/**
 * A URL Ghost will load: resolved against the manifest's own URL, and never on an origin
 * Ghost is served from. `linkOnly` lifts that last rule for a URL that is only ever
 * linked to, which a publisher's own app may well point at their own site.
 */
function urlField({ base, ghostOrigins, allowLocalhost }: UrlRules, linkOnly = false) {
  return z
    .string('Expected a URL, or a path relative to the manifest')
    .min(1, 'Expected a URL, or a path relative to the manifest')
    .max(URL_MAX_LENGTH, `Expected at most ${URL_MAX_LENGTH} characters`)
    .transform((value, ctx) => {
      let url: URL;
      try {
        url = new URL(value, base);
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Expected a URL, or a path relative to the manifest',
        });
        return z.NEVER;
      }
      const problem = checkResolvedUrl(url, allowLocalhost);
      if (problem) {
        ctx.addIssue({ code: 'custom', message: problem });
        return z.NEVER;
      }
      if (!linkOnly && ghostOrigins.has(url.origin)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Expected an address other than the one Ghost itself is served from',
        });
        return z.NEVER;
      }
      return url.href;
    });
}

function plainText(maxLength: number) {
  return z
    .string('Expected text')
    .trim()
    .min(1, 'Expected text')
    .max(maxLength, `Expected at most ${maxLength} characters`)
    .refine(isPlainText, 'Expected plain text on one line');
}

function manifestSchema(rules: UrlRules) {
  const author = z.strictObject(
    {
      name: plainText(AUTHOR_NAME_MAX_LENGTH),
      url: urlField(rules, true),
    },
    'Expected an author with a name and a url',
  );

  // The icon is drawn by Ghost on the app's accent colour: either one of the icons Admin
  // ships, by name, or an SVG the app serves. Ghost shows the SVG as an image and never
  // inlines it. A name Admin does not know is not an error here, since the set depends on
  // the Admin build; Admin falls back to a default icon.
  const icon = z
    .strictObject(
      {
        name: z
          .string('Expected an icon name')
          .max(ICON_NAME_MAX_LENGTH, `Expected at most ${ICON_NAME_MAX_LENGTH} characters`)
          .regex(ICON_NAME, 'Expected an icon name such as audio-lines')
          .optional(),
        url: urlField(rules).optional(),
      },
      'Expected an icon with either a name or a url',
    )
    .transform(({ name, url }, ctx): { name: string } | { url: string } => {
      if (name !== undefined && url === undefined) {
        return { name };
      }
      if (url !== undefined && name === undefined) {
        return { url };
      }
      ctx.addIssue({ code: 'custom', message: 'Expected an icon with either a name or a url' });
      return z.NEVER;
    });

  const adminPage = z.strictObject({
    type: z.literal('admin_page'),
    url: urlField(rules),
  });

  // Every surface Ghost supports. A new one is added here and nowhere else.
  const surfaceTypes = [adminPage] as const;

  const surface = z.discriminatedUnion('type', surfaceTypes, {
    error: `Expected a surface with a type of: ${surfaceTypes.map((entry) => entry.shape.type.value).join(', ')}`,
  });

  return z.strictObject({
    id: z.custom<string>(isValidAppId, {
      error: `Expected a lowercase reverse-domain ID such as com.example.app, at most ${APP_ID_MAX_LENGTH} characters`,
    }),
    name: plainText(NAME_MAX_LENGTH),
    description: plainText(DESCRIPTION_MAX_LENGTH),
    author,
    accent_color: z
      .string('Expected a hex colour such as #ff5500')
      .regex(HEX_COLOR, 'Expected a hex colour such as #ff5500')
      .toLowerCase(),
    icon,
    surfaces: z
      .array(surface, 'Expected a list of surfaces')
      .min(1, 'Expected at least one surface')
      .superRefine((surfaces, ctx) => {
        const seen = new Set<string>();
        surfaces.forEach((entry, index) => {
          if (seen.has(entry.type)) {
            ctx.addIssue({
              code: 'custom',
              message: `Expected at most one ${entry.type} surface`,
              path: [index],
            });
          }
          seen.add(entry.type);
        });
      }),
  });
}

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
