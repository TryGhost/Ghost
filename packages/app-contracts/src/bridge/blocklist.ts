/**
 * The Admin API routes that apps can't reach through the fetch escape hatch.
 *
 * Apps call the Admin API with the staff user's own session. This stands in for an app-scoped
 * token with permissions, and the blocklist will be removed once that token exists. Until then,
 * it blocks the routes that hand out a credential that outlives the app's session, change who
 * can sign in or who the staff users are, change the site's settings, send site events to other
 * services, upload a file, import, export or delete the whole site, or install and approve apps.
 *
 * The list is not complete. These routes stay open until the security review that comes before
 * opening apps to external developers decides on them (BER-3992):
 *
 * - Changing a member's email through `PUT /members/:id`, which lets whoever owns the new
 *   address sign in as that member. Blocking it would block every member edit.
 * - Connecting Stripe through `/members/stripe_connect`.
 * - Writes that leave code on the site: installing a theme from GitHub
 *   (`POST /themes/install?source=github`), and posts and pages, whose HTML cards are served
 *   unchanged, so any script in them runs on the site's own origin.
 * - Bulk deletes, edits and exports: `DELETE /members?all=true`, `PUT /members/bulk`,
 *   `GET /posts/export`, `DELETE /posts`, `DELETE /pages` and the bulk edits of posts and
 *   pages.
 *
 * Blocking only the bulk routes would gain little: an app acts with the staff user's own
 * authority, so it could make the same changes one request at a time.
 *
 * A route is blocked for every method. Separating harmless reads from dangerous writes per
 * route would mean more rules to get wrong, and apps don't need to read any of these routes.
 *
 * Patterns are written in path segments: `:id` matches any one segment, and a final `*`
 * matches one or more further segments, so `/db` and `/db/*` together cover `/db` and
 * everything under it.
 */

export interface BlockedAdminApiCategory {
  /** A stable name for the category, for logs and error messages. */
  readonly name: string;
  /** Why an app may not reach these routes. */
  readonly reason: string;
  /** Paths relative to the Admin API root, in the form Ghost core's `routes.js` uses. */
  readonly paths: readonly string[];
}

export const ADMIN_API_BLOCKLIST: readonly BlockedAdminApiCategory[] = [
  {
    name: 'staff_accounts',
    reason:
      "Editing a staff user can change their email or role, deleting one removes them, a staff token is a key to the Admin API as that person, and changing a password or the site's owner changes who controls the site. Reading a user goes through `/users/?filter=id:…`, which stays open.",
    paths: ['/users/:id', '/users/:id/*', '/users/password', '/users/owner'],
  },
  {
    name: 'integrations',
    reason: "Integrations hold Admin and Content API keys, which would outlive the app's session.",
    paths: ['/integrations', '/integrations/*'],
  },
  {
    name: 'identity_tokens',
    reason:
      "An identity token proves the staff user's identity to other services, and the app would choose where it goes.",
    paths: ['/identities', '/identities/*'],
  },
  {
    name: 'sessions',
    reason: 'Signing in and out, verification, setup and password resets belong to the person.',
    paths: ['/session', '/session/*', '/authentication', '/authentication/*'],
  },
  {
    name: 'member_sign_in',
    reason:
      "A member's sign-in link signs in as that member until the link expires, even after the app's session ends. This covers sign-in links only: changing a member's email has the same effect but stays open until BER-3992.",
    paths: ['/members/:id/signin_urls'],
  },
  {
    name: 'gift_links',
    reason:
      "A gift link unlocks a paid post or page for anyone who has it until the link expires, even after the app's session ends. Removing all gift links revokes every link the publisher has shared.",
    paths: ['/posts/:id/gift_links', '/pages/:id/gift_links', '/gift_links', '/gift_links/*'],
  },
  {
    name: 'settings',
    reason:
      "Settings decide who can read the site and sign in (a private site's access code, signup, staff two-factor), send data elsewhere (Mailgun, Stripe, Slack) and put code on every page (code injection, routes). An app reads the site facts it needs from the start context.",
    paths: ['/settings', '/settings/*'],
  },
  {
    name: 'uploads',
    reason:
      "Files stay out of the bridge for now. An uploaded file is served from the site's own origin, where an HTML file or a theme runs as the site, and a CSV import adds posts or members in bulk. The members export uses the same URL as the import, so it's blocked too.",
    paths: [
      '/images/upload',
      '/media/upload',
      '/media/thumbnail/upload',
      '/files/upload',
      '/themes/upload',
      '/redirects/upload',
      '/posts/upload',
      '/members/upload',
    ],
  },
  {
    name: 'invites',
    reason: 'An invite adds a staff user, who could then act without the app.',
    paths: ['/invites', '/invites/*'],
  },
  {
    name: 'webhooks',
    reason: 'A webhook sends site events to any URL it names, for as long as it exists.',
    paths: ['/webhooks', '/webhooks/*'],
  },
  {
    name: 'database',
    reason: 'Importing, exporting or deleting the whole site is not something an app does.',
    paths: ['/db', '/db/*', '/exports', '/exports/*'],
  },
  {
    name: 'third_party_tokens',
    reason: "Tokens for Ghost's own analytics and feedback services are for Admin alone.",
    paths: ['/tinybird/token', '/featurebase/token', '/config/featurebase'],
  },
  {
    name: 'apps',
    reason: 'An app must not install, approve, change or remove apps, itself included.',
    paths: ['/apps', '/apps/*'],
  },
];

const ANY_SEGMENT = ':';
const ANY_REST = '*';

// Each pattern split into segments, with every `:name` replaced by the same wildcard marker.
const PATTERNS = ADMIN_API_BLOCKLIST.flatMap((category) =>
  category.paths.map((path) =>
    path
      .split('/')
      .filter(Boolean)
      .map((segment) => (segment.startsWith(':') ? ANY_SEGMENT : segment)),
  ),
);

function matches(pattern: readonly string[], segments: readonly string[]): boolean {
  for (const [index, part] of pattern.entries()) {
    if (part === ANY_REST) {
      return segments.length > index;
    }
    const segment = segments[index];
    if (segment === undefined || (part !== ANY_SEGMENT && part !== segment)) {
      return false;
    }
  }
  return segments.length === pattern.length;
}

/**
 * Whether apps are blocked from an Admin API path. Takes a pathname relative to the Admin API
 * root, such as `/users/abc/token/`. Everything from the first `?` or `#` is ignored, so a
 * query can't be mistaken for part of the path.
 *
 * When a path could be interpreted more than one way, this blocks it. Ghost's router ignores
 * case and a trailing slash, so this does too. It decodes percent-escapes and drops empty
 * segments, so `/%64b` and `/users//password` are caught. It blocks any path that can't be
 * decoded, or that still contains `.` or `..` after decoding, because where such a path leads
 * depends on which parser reads it.
 */
export function isBlockedAdminApiPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/, 1)[0] as string;
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return true;
  }
  const segments = decoded.toLowerCase().split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return true;
  }
  return PATTERNS.some((pattern) => matches(pattern, segments));
}
