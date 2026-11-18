/**
 * The scope registry: every scope an app can ask for, defined once. Manifest validation,
 * Admin's review screen and the bridge's allowlist all read it, so no other copy of the list
 * exists.
 *
 * A scope's name is the permission Platform uses in Core, `<resource>:<action>`, and its
 * resource is Platform's object type, exactly. The names are provisional until Platform agrees
 * them. There are no member scopes, and none for staff invites, role changes, webhooks, themes,
 * routes or redirects. Pages come under the `post:*` scopes.
 *
 * The wording is Ghost's own, never the developer's, so an app can't describe a scope as less
 * than it is. The review screen shows one line per resource, with each declared scope's
 * wording under it in the order they're listed here.
 *
 * This module is data only. Reading, comparing and describing access live with the manifest's
 * access field, in `manifest/access.ts`.
 */

export interface AppResource {
  /** What the review screen calls the resource. */
  readonly title: string;
}

export const APP_RESOURCES = {
  post: { title: 'Posts and pages' },
  tag: { title: 'Tags' },
  tier: { title: 'Tiers' },
  newsletter: { title: 'Newsletters' },
  slug: { title: 'URL slugs' },
  user: { title: 'Staff' },
} as const satisfies Record<string, AppResource>;

export type AppResourceName = keyof typeof APP_RESOURCES;

export interface AppScope {
  readonly resource: AppResourceName;
  /** What the scope lets an app do, as a sentence that stands on its own. */
  readonly wording: string;
}

export const APP_SCOPES = {
  'post:browse': { resource: 'post', wording: 'List and search posts and pages.' },
  'post:read': { resource: 'post', wording: 'Read any post or page.' },
  // A create can publish straight away, and can create tags by naming them.
  'post:add': {
    resource: 'post',
    wording:
      'Create posts and pages, including published ones, choose who can read them and create tags for them.',
  },
  // Editing also publishes, sends newsletters and changes who can read a post, until finer
  // scopes split those out.
  'post:edit': {
    resource: 'post',
    wording:
      'Edit, publish and email posts and pages, change who can read them and create tags for them.',
  },
  'post:destroy': { resource: 'post', wording: 'Delete posts and pages.' },
  'post:read_stats': {
    resource: 'post',
    wording: 'See how each post performed, by email, in signups and in feedback.',
  },
  'tag:browse': { resource: 'tag', wording: 'List and search tags.' },
  'tag:read': { resource: 'tag', wording: 'Read any tag.' },
  'tag:add': { resource: 'tag', wording: 'Create tags.' },
  'tag:edit': { resource: 'tag', wording: 'Edit tags.' },
  'tag:destroy': { resource: 'tag', wording: 'Delete tags.' },
  'tier:browse': { resource: 'tier', wording: 'List your tiers and their prices.' },
  'newsletter:browse': { resource: 'newsletter', wording: 'List your newsletters.' },
  'slug:generate': { resource: 'slug', wording: 'Ask Ghost for an unused URL slug.' },
  // Staff email addresses are returned until the server leaves them out for apps.
  'user:browse': {
    resource: 'user',
    wording: 'List staff users, with their profiles and email addresses.',
  },
} as const satisfies Record<string, AppScope>;

export type AppScopeName = keyof typeof APP_SCOPES;

/** The scopes that belong to a resource, such as `tag:browse | tag:read | …` for `tag`. */
export type AppScopeNameOf<R extends AppResourceName> = {
  [N in AppScopeName]: (typeof APP_SCOPES)[N]['resource'] extends R ? N : never;
}[AppScopeName];

export const APP_SCOPE_NAMES = Object.keys(APP_SCOPES) as AppScopeName[];

export function isAppScopeName(name: unknown): name is AppScopeName {
  return typeof name === 'string' && Object.hasOwn(APP_SCOPES, name);
}
