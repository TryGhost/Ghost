/**
 * The Admin API routes an app may not reach through the fetch escape hatch.
 *
 * Apps call the Admin API with the staff user's own session for now, as a stand-in for the
 * app-scoped token that comes with permissions. Until then, these routes are closed to them:
 * each one hands out a credential that would outlive the app's session, changes who can sign
 * in or who the staff are, sends site events to an address of its choosing, imports, exports
 * or deletes the whole site through `/db`, or installs and approves apps. The blocklist goes
 * when the token arrives.
 *
 * It is not complete, and does not claim to be. These stay open until the security review
 * before external developers decides on them (BER-3992):
 *
 * - Settings that send data elsewhere for as long as they stay set: the Mailgun and Stripe
 *   keys and `slack_url` through `PUT /settings`, and connecting Stripe through
 *   `/members/stripe_connect`.
 * - Writes that leave code on the site: code injection through `PUT /settings`, theme uploads
 *   and installs (`POST /themes/upload`, `POST /themes/install?source=github`), and redirects
 *   and routes uploads.
 * - Bulk deletes, edits and exports: `DELETE /members?all=true`, `PUT /members/bulk`, the
 *   members CSV at `GET /members/upload`, `GET /posts/export`, `DELETE /posts`,
 *   `DELETE /pages` and the bulk edits of posts and pages.
 *
 * Closing the bulk routes alone would gain little: an app acts with the staff user's own
 * authority, so it could do the same one request at a time.
 *
 * A route is blocked whatever the method. Telling a harmless read from a dangerous write per
 * route is more rules to get wrong, and nothing here is a read an app needs.
 *
 * Patterns are written in path segments: `:id` matches any one segment, and a final `*`
 * matches one or more further segments, so `/db` and `/db/*` together are `/db` and
 * everything under it.
 */

export interface BlockedAdminApiCategory {
  /** A stable name for the category, for logs and error messages. */
  readonly name: string;
  /** Why an app may not reach these routes. */
  readonly reason: string;
  /** Paths relative to the Admin API root, as `routes.js` in Ghost core writes them. */
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
    reason: "An identity token proves who the staff user is to other services, on the app's say.",
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
      "A member's sign-in link signs in as that member for as long as the link lasts, whatever becomes of the app's session.",
    paths: ['/members/:id/signin_urls'],
  },
  {
    name: 'invites',
    reason: 'An invite adds a staff user, who could then act without the app.',
    paths: ['/invites', '/invites/*'],
  },
  {
    name: 'webhooks',
    reason: 'A webhook sends site events to an address of its choosing for as long as it exists.',
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

// Each pattern as its segments, with every `:name` reduced to one marker.
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
 * Whether an Admin API path is closed to apps. Takes a pathname relative to the Admin API
 * root, such as `/users/abc/token/`, as `checkAdminApiPath` cuts it from the resolved URL:
 * the pathname, never the query string. Anything from a `?` or `#` on is ignored all the
 * same, so a query cannot be mistaken for a path.
 *
 * Errs towards blocking wherever the path could be read more than one way. Ghost's router
 * ignores case and a trailing slash, so this does too. Percent-escapes are decoded and empty
 * segments dropped, so `/%64b` and `/users//password` are caught, and a path that cannot be
 * decoded, or that still holds `.` or `..` once it is, is blocked outright because where it
 * leads depends on who reads it.
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
