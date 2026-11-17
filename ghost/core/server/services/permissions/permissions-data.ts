// The permissions Ghost knows about and which roles hold them. This is the
// source of truth for permission checks: to add a permission, add it here and
// grant it to roles. No migration is needed.
//
// Owner is not listed: it has no permissions of its own and is handled as a
// bypass in canThis.

import { domainFragments } from '../../../../bootstrap/domains/fragments';

export type RolePermissionValue = 'all' | readonly string[];

/**
 * Every action that exists for each object type.
 */
const corePermissions = {
  db: ['exportContent', 'importContent', 'deleteAllContent', 'backupContent'],
  content_import: ['importContent'],
  mail: ['send'],
  notification: ['browse', 'add', 'destroy'],
  post: ['browse', 'read', 'edit', 'add', 'destroy', 'publish'],
  setting: ['browse', 'read', 'edit'],
  slug: ['generate'],
  tag: ['browse', 'read', 'edit', 'add', 'destroy'],
  theme: ['browse', 'edit', 'activate', 'readActive', 'add', 'read', 'destroy'],
  user: ['browse', 'read', 'edit', 'add', 'destroy'],
  role: ['assign', 'browse'],
  invite: ['browse', 'read', 'edit', 'add', 'destroy'],
  redirect: ['download', 'upload'],
  webhook: ['add', 'edit', 'destroy'],
  integration: ['browse', 'read', 'edit', 'add', 'destroy'],
  api_key: ['browse', 'read', 'edit', 'add', 'destroy'],
  action: ['browse'],
  member: ['browse', 'read', 'edit', 'add', 'destroy'],
  product: ['browse', 'read', 'edit', 'add', 'destroy'],
  email_preview: ['read', 'sendTestEmail'],
  email: ['browse', 'read', 'retry'],
  label: ['browse', 'read', 'edit', 'add', 'destroy'],
  member_custom_field: ['edit', 'add', 'destroy'],
  automated_email: ['browse', 'read', 'edit', 'add', 'destroy'],
  email_design_setting: ['browse', 'read', 'edit', 'add', 'destroy'],
  member_signin_url: ['read'],
  identity: ['read'],
  members_stripe_connect: ['auth'],
  snippet: ['browse', 'read', 'edit', 'add', 'destroy'],
  offer: ['browse', 'read', 'edit', 'add'],
  authentication: ['reset'],
  custom_theme_setting: ['browse', 'edit'],
  newsletter: ['browse', 'read', 'add', 'edit'],
  comment: ['browse', 'read', 'edit', 'add', 'destroy', 'moderate', 'like', 'unlike', 'report'],
  link: ['browse', 'edit'],
  mention: ['browse'],
  collection: ['browse', 'read', 'edit', 'add', 'destroy'],
  automation: ['browse', 'read', 'add', 'edit', 'poll'],
  gift: ['flushReminders', 'flushDeliveries'],
  gift_link: ['manage', 'removeAll'],
  app_installation: ['browse', 'read', 'add', 'destroy'],
  upgrade: ['browse', 'read', 'add'],
} as const satisfies Record<string, readonly string[]>;

// A domain declares the permissions for what it owns in its permissions.ts.
// Those are merged in here, so every permission is still found in one place at
// run time. Their object types are not known to the compiler.
const domainPermissions = domainFragments('permissions').map(({ value }) => value);

export const permissions: typeof corePermissions & Record<string, readonly string[]> =
  Object.assign({}, corePermissions, ...domainPermissions.map(({ objects }) => objects));

export type ObjectType = keyof typeof corePermissions;

/**
 * The permissions each role holds, by object type: 'all' grants every action
 * for that object type, otherwise only the listed actions.
 */
const coreRolePermissions = {
  Administrator: {
    db: 'all',
    content_import: 'all',
    mail: 'all',
    notification: 'all',
    post: 'all',
    setting: 'all',
    slug: 'all',
    tag: 'all',
    theme: 'all',
    user: 'all',
    role: 'all',
    invite: 'all',
    redirect: 'all',
    webhook: 'all',
    integration: 'all',
    api_key: 'all',
    action: 'all',
    member: 'all',
    product: 'all',
    label: 'all',
    member_custom_field: 'all',
    automated_email: 'all',
    email_design_setting: 'all',
    email_preview: 'all',
    email: 'all',
    member_signin_url: ['read'],
    snippet: 'all',
    custom_theme_setting: 'all',
    offer: 'all',
    authentication: ['reset'],
    members_stripe_connect: ['auth'],
    newsletter: 'all',
    comment: 'all',
    link: 'all',
    mention: ['browse'],
    collection: 'all',
    gift_link: 'all',
    app_installation: 'all',
    automation: ['browse', 'read', 'edit', 'add'],
    identity: ['read'],
    upgrade: ['browse', 'read', 'add'],
  },
  'DB Backup Integration': {
    db: 'all',
    member: ['browse'],
    post: ['browse'],
  },
  'Scheduler Integration': {
    post: ['publish'],
    automation: ['poll'],
    gift: ['flushReminders', 'flushDeliveries'],
  },
  'Self-Serve Migration Integration': {
    db: ['importContent'],
    content_import: ['importContent'],
    member: ['add'],
    tag: ['read'],
  },
  'Admin Integration': {
    mail: 'all',
    notification: 'all',
    post: 'all',
    setting: 'all',
    slug: 'all',
    tag: 'all',
    theme: 'all',
    user: 'all',
    role: 'all',
    invite: 'all',
    redirect: 'all',
    webhook: 'all',
    action: 'all',
    member: 'all',
    label: 'all',
    member_custom_field: 'all',
    automated_email: 'all',
    email_design_setting: 'all',
    email_preview: 'all',
    email: 'all',
    snippet: 'all',
    product: ['browse', 'read', 'add', 'edit'],
    offer: ['browse', 'read', 'add', 'edit'],
    newsletter: ['browse', 'read', 'add', 'edit'],
    comment: 'all',
    link: 'all',
    mention: ['browse'],
    collection: 'all',
    automation: ['browse', 'read', 'edit', 'add'],
    member_signin_url: ['read'],
    gift_link: ['manage'],
  },
  'Super Editor': {
    notification: ['browse', 'destroy'],
    post: 'all',
    setting: ['browse', 'read'],
    slug: 'all',
    tag: 'all',
    user: 'all',
    role: 'all',
    invite: 'all',
    theme: ['browse', 'readActive'],
    email_preview: 'all',
    email: 'all',
    snippet: 'all',
    label: ['browse', 'read', 'edit', 'add', 'destroy'],
    product: ['browse', 'read'],
    newsletter: ['browse', 'read'],
    collection: 'all',
    member: ['browse', 'read', 'add', 'edit', 'destroy'],
    member_signin_url: ['read'],
    offer: ['browse', 'read'],
    comment: 'all',
    gift_link: ['manage'],
  },
  Editor: {
    notification: ['browse', 'destroy'],
    post: 'all',
    setting: ['browse', 'read'],
    slug: 'all',
    tag: 'all',
    user: 'all',
    role: 'all',
    invite: 'all',
    theme: ['browse', 'readActive'],
    email_preview: 'all',
    email: 'all',
    snippet: 'all',
    label: ['browse', 'read'],
    product: ['browse', 'read'],
    newsletter: ['browse', 'read'],
    collection: 'all',
    gift_link: ['manage'],
  },
  Author: {
    post: ['browse', 'read', 'edit', 'add', 'destroy'],
    setting: ['browse', 'read'],
    slug: 'all',
    tag: ['browse', 'read', 'add'],
    user: ['browse', 'read'],
    role: ['browse'],
    theme: ['browse', 'readActive'],
    email_preview: ['read'],
    email: ['read'],
    snippet: ['browse', 'read'],
    label: ['browse', 'read'],
    product: ['browse', 'read'],
    newsletter: ['browse', 'read'],
    collection: ['browse', 'read', 'add'],
  },
  Contributor: {
    post: ['browse', 'read', 'edit', 'add', 'destroy'],
    setting: ['browse', 'read'],
    slug: 'all',
    tag: ['browse', 'read'],
    user: ['browse', 'read'],
    role: ['browse'],
    theme: ['browse'],
    email_preview: ['read'],
    email: ['read'],
    snippet: ['browse', 'read'],
    collection: ['browse', 'read'],
  },
} satisfies Record<string, Partial<Record<ObjectType, RolePermissionValue>>>;

export const rolePermissions: typeof coreRolePermissions &
  Record<string, Record<string, RolePermissionValue>> = { ...coreRolePermissions };
for (const { roles = {} } of domainPermissions) {
  for (const [role, grants] of Object.entries(roles)) {
    (rolePermissions as Record<string, Record<string, RolePermissionValue>>)[role] = {
      ...rolePermissions[role],
      ...grants,
    };
  }
}
