import type { FetchMethod } from './rules.ts';

/**
 * The Admin API routes that apps can't reach through the fetch escape hatch.
 *
 * Apps call the Admin API with the staff user's own session. This stands in for an app-scoped
 * token with permissions, and the blocklist will be removed once that token exists. Until then,
 * it blocks the routes that hand out a credential that outlives the app's session, change who
 * can sign in or who the staff users are, read or change members or their personal details,
 * change the site's settings, send site events to other services, upload a file, delete in
 * bulk, import, export or delete the whole site, or install and approve apps.
 *
 * The list is not complete. These routes stay open until the security review that comes before
 * opening apps to external developers decides on them (BER-3992):
 *
 * - Writes that leave code on the site: installing a theme from GitHub
 *   (`POST /themes/install?source=github`), and posts and pages, whose HTML cards are served
 *   unchanged, so any script in them runs on the site's own origin.
 * - Bulk edits and exports of posts and pages: `PUT /posts/bulk`, `PUT /pages/bulk` and
 *   `GET /posts/export`.
 *
 * A route is blocked for every method, unless its category names the methods it blocks. Only
 * bulk deletes do, because they share their path with listing: `DELETE /posts/` deletes
 * every post a filter matches, while `GET /posts/` lists them. Deleting one post or page at a
 * time stays open.
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
  /** The methods blocked on these paths. Every method is blocked when this is left out. */
  readonly methods?: readonly FetchMethod[];
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
    name: 'members',
    reason:
      "Members are the publisher's audience, and their records hold personal data: names, emails, subscriptions and payments. Apps can't read or change members, their labels, or anything else under `/members` (sign-in links, imports and exports, Stripe, stats and events).",
    paths: ['/members', '/members/*', '/labels', '/labels/*'],
  },
  {
    name: 'member_details',
    reason:
      "These routes return members' names and emails along with other records: comments and their moderation, post feedback, an email's delivery failures and automation runs.",
    paths: [
      '/comments',
      '/comments/*',
      '/feedback/*',
      '/emails/:id/recipient-failures',
      '/automations/:id/runs',
      '/automations/:id/runs/*',
    ],
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
      "Files stay out of the bridge for now. An uploaded file is served from the site's own origin, where an HTML file or a theme runs as the site, and a CSV import adds posts in bulk.",
    paths: [
      '/images/upload',
      '/media/upload',
      '/media/thumbnail/upload',
      '/files/upload',
      '/themes/upload',
      '/redirects/upload',
      '/posts/upload',
    ],
  },
  {
    name: 'bulk_deletes',
    reason:
      'Deleting every post or page a filter matches can wipe the site in one request. Deleting one at a time stays open.',
    paths: ['/posts', '/pages'],
    methods: ['DELETE'],
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

// Each pattern split into segments, with every `:name` replaced by the same wildcard marker,
// and the methods it blocks (every method when there are none).
const PATTERNS = ADMIN_API_BLOCKLIST.flatMap((category) =>
  category.paths.map((path) => ({
    segments: path
      .split('/')
      .filter(Boolean)
      .map((segment) => (segment.startsWith(':') ? ANY_SEGMENT : segment)),
    methods: category.methods,
  })),
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
 * Whether apps are blocked from a request to an Admin API path with this method. Takes a
 * pathname relative to the Admin API root, such as `/users/abc/token/`. Everything from the first `?` or `#` is ignored, so a
 * query can't be mistaken for part of the path.
 *
 * When a path could be interpreted more than one way, this blocks it. Ghost's router ignores
 * case and a trailing slash, so this does too. It decodes percent-escapes and drops empty
 * segments, so `/%64b` and `/users//password` are caught. It blocks any path that can't be
 * decoded, or that still contains `.` or `..` after decoding, because where such a path leads
 * depends on which parser reads it.
 */
export function isBlockedAdminApiPath(pathname: string, method: FetchMethod): boolean {
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
  return PATTERNS.some(
    (pattern) =>
      (!pattern.methods || pattern.methods.includes(method)) && matches(pattern.segments, segments),
  );
}
