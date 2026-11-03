/** One kind of access an app gets, as a consent screen lists it. */
export interface AccessItem {
  title: string;
  description: string;
  /** The bridge's scopes this entry stands for, by name, such as `posts:write`. */
  scopes: string[];
}

/**
 * What an app can do with the account of whoever opens it. Apps act with the staff user's own
 * session until Permissions and auth gives them a token, and the bridge only lets them reach
 * the routes in `ADMIN_API_ALLOWLIST`, so this lists its scopes, each once, in words a
 * publisher reads. A test holds the two together.
 *
 * The allowlist leaves out members, settings, integrations and everything else that hands out
 * lasting access, but that isn't a line an app can't cross: it can write script into a post or
 * page, which runs as whoever views it on the site, and as Admin where the site and Admin share
 * an origin. So posts and pages say an app can add scripts to them, and that publishing can send
 * an email.
 *
 * Reading takes Core's includes too, so a scope covers more than its routes' plain answers: how
 * posts did by email and in signups comes with `posts:read`, and is listed with newsletters, where
 * a publisher looks for it.
 */
export const ACCOUNT_ACCESS: AccessItem[] = [
  {
    title: 'Posts and pages',
    description:
      'View, create, edit, publish and delete posts and pages, including drafts, scheduled posts and earlier versions. Change who wrote them and who can read them, and add HTML and scripts that run for anyone who views them. Publishing a post that’s scheduled as a newsletter emails it to your members.',
    scopes: ['posts:read', 'posts:write', 'pages:read', 'pages:write', 'slugs:read'],
  },
  {
    title: 'Tags',
    description: 'View, create, edit and delete tags.',
    scopes: ['tags:read', 'tags:write'],
  },
  {
    title: 'Staff',
    description: 'View staff users, including their email addresses and roles.',
    scopes: ['users:read'],
  },
  {
    title: 'Tiers',
    description: 'View your tiers, including their prices.',
    scopes: ['tiers:read'],
  },
  {
    title: 'Newsletters and post performance',
    description:
      'View your newsletters and how many members subscribe to each, and how posts did: email opens and clicks, feedback, signups and paid conversions.',
    scopes: ['newsletters:read'],
  },
  {
    title: 'Site details',
    description: 'View your site’s public details, like its title, logo, language and timezone.',
    scopes: ['site:read'],
  },
];
