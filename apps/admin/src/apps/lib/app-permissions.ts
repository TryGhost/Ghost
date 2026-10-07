import type { AppInstallation, AppManifest } from '@/apps/types';

/**
 * Exploration only: how scoped app access could be asked for and shown. Apps
 * still act with the staff user's session (see ./access); nothing here is
 * enforced, and manifests don't declare permissions yet. Resources and actions
 * mirror the Admin API's permission fixtures, e.g. `post` → `browse`.
 */
export interface AppPermission {
  resource: PermissionResource;
  actions: PermissionAction[];
}

export type PermissionResource =
  | 'post'
  | 'tag'
  | 'member'
  | 'label'
  | 'newsletter'
  | 'email'
  | 'mail'
  | 'comment'
  | 'offer'
  | 'setting';

export type PermissionAction =
  | 'browse'
  | 'read'
  | 'add'
  | 'edit'
  | 'destroy'
  | 'publish'
  | 'send'
  | 'moderate';

interface ResourceCopy {
  label: string;
  /** What the access covers, finishing the sentence after the verbs. */
  covers: string;
}

const RESOURCES: Record<PermissionResource, ResourceCopy> = {
  post: {
    label: 'Posts and pages',
    covers: 'all posts and pages, including drafts and scheduled ones',
  },
  tag: { label: 'Tags', covers: 'tag names and descriptions' },
  member: {
    label: 'Members',
    covers: 'names, email addresses and subscription status',
  },
  label: { label: 'Member labels', covers: 'the labels that group your members' },
  newsletter: { label: 'Newsletters', covers: 'newsletters and their sender details' },
  email: { label: 'Newsletter emails', covers: 'open and click rates' },
  mail: { label: 'Email sending', covers: 'email from your site’s address' },
  comment: { label: 'Comments', covers: 'comments and who wrote them' },
  offer: { label: 'Offers', covers: 'discounts and free trials for paid plans' },
  setting: {
    label: 'Site settings',
    covers: 'your site’s settings, like its title, design and integrations',
  },
};

// Ordered so the sentence reads from least to most capable.
const VERBS: [PermissionAction[], string][] = [
  [['browse', 'read'], 'view'],
  [['add'], 'create'],
  [['edit'], 'edit'],
  [['publish'], 'publish'],
  [['moderate'], 'moderate'],
  [['send'], 'send'],
  [['destroy'], 'delete'],
];

function verbsFor(actions: PermissionAction[]): string {
  const words = VERBS.filter(([covers]) => covers.some((action) => actions.includes(action))).map(
    ([, verb]) => verb,
  );
  return words.length > 1
    ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
    : (words[0] ?? '');
}

/** E.g. “View names, email addresses and subscription status”. */
function detailFor(resource: PermissionResource, actions: PermissionAction[]): string {
  const text = `${verbsFor(actions)} ${RESOURCES[resource].covers}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface PermissionRow {
  resource: PermissionResource;
  label: string;
  /** What the app can do with it, as one line. */
  detail: string;
  /** Only in an update: `new` access to something, or `more` access to it. */
  change?: 'new' | 'more';
  /** For `more`: what was allowed before, e.g. “view”. */
  previously?: string;
}

export function describePermissions(permissions: AppPermission[]): PermissionRow[] {
  return permissions.map(({ resource, actions }) => ({
    resource,
    label: RESOURCES[resource].label,
    detail: detailFor(resource, actions),
  }));
}

/**
 * What an update asks for on top of what was approved. Only access that's new
 * or wider is listed, so the publisher judges just the difference.
 */
export function describePermissionChanges(
  granted: AppPermission[],
  pending: AppPermission[],
): PermissionRow[] {
  const rows: PermissionRow[] = [];
  for (const { resource, actions } of mergePermissions(granted, pending)) {
    const before = granted.find((permission) => permission.resource === resource);
    const row = {
      resource,
      label: RESOURCES[resource].label,
      detail: detailFor(resource, actions),
    };
    if (!before) {
      rows.push({ ...row, change: 'new' });
    } else if (verbsFor(before.actions) !== verbsFor(actions)) {
      rows.push({ ...row, change: 'more', previously: verbsFor(before.actions) });
    }
  }
  return rows;
}

export function mergePermissions(
  granted: AppPermission[],
  pending: AppPermission[],
): AppPermission[] {
  const merged = granted.map((permission) => ({ ...permission, actions: [...permission.actions] }));
  for (const { resource, actions } of pending) {
    const existing = merged.find((permission) => permission.resource === resource);
    if (existing) {
      existing.actions = [...new Set([...existing.actions, ...actions])];
    } else {
      merged.push({ resource, actions: [...actions] });
    }
  }
  return merged;
}

/** Stand-ins for what each dev app would declare in its manifest. */
const REQUESTED_BY_APP: Record<string, AppPermission[]> = {
  'Content calendar': [
    { resource: 'post', actions: ['browse', 'read'] },
    { resource: 'tag', actions: ['browse'] },
  ],
  'Best time to send': [
    { resource: 'email', actions: ['browse', 'read'] },
    { resource: 'newsletter', actions: ['browse', 'read'] },
    { resource: 'post', actions: ['browse'] },
  ],
};

const DEFAULT_REQUEST: AppPermission[] = [{ resource: 'post', actions: ['browse', 'read'] }];

export function requestedPermissions(manifest: AppManifest): AppPermission[] {
  return REQUESTED_BY_APP[manifest.name] ?? DEFAULT_REQUEST;
}

/** Rows for installing an app from its manifest. */
export function installRows(manifest: AppManifest): PermissionRow[] {
  return describePermissions(requestedPermissions(manifest));
}

/** Rows for an installed app's update: only the new or wider access. */
export function updateRows(installation: AppInstallation): PermissionRow[] {
  return describePermissionChanges(
    installation.permissions ?? [],
    installation.pendingPermissions ?? [],
  );
}
