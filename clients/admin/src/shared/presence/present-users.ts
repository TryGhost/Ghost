import type { ActivePresence } from './presence-api';

export interface PresentUser {
  id: string;
  name: string;
  image: string | null;
}

interface StaffUserLike {
  id: string;
  name: string;
  profile_image: string | null;
}

/**
 * One row per user, named from the staff list and ordered by name. The server
 * reports last heartbeats, which move with every poll, so any order built on
 * them moves too. Users the staff list does not know are left out: a ghost of
 * an id is not worth an avatar.
 */
export function presentUsers(
  active: ActivePresence[],
  users: readonly StaffUserLike[] | undefined,
): PresentUser[] {
  if (!users || active.length === 0) {
    return [];
  }
  const byId = new Map(users.map((user) => [user.id, user]));
  const seen = new Map<string, PresentUser>();
  for (const entry of active) {
    const user = byId.get(entry.userId);
    if (user && !seen.has(user.id)) {
      seen.set(user.id, { id: user.id, name: user.name, image: user.profile_image });
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}

/**
 * Present ids the staff list cannot name, sorted so the lookup they key stays
 * the same between polls. Empty until the list has loaded.
 */
export function unnamedUserIds(
  active: ActivePresence[],
  users: readonly StaffUserLike[] | undefined,
): string[] {
  if (!users) {
    return [];
  }
  const known = new Set(users.map((user) => user.id));
  const unnamed = new Set<string>();
  for (const { userId } of active) {
    // Ids go into a filter string, so anything that is not a plain id is dropped.
    if (!known.has(userId) && /^[a-z0-9]+$/i.test(userId)) {
      unnamed.add(userId);
    }
  }
  return [...unnamed].sort();
}

/** "Alex", "Alex and Sam", "Alex, Sam and Kim". */
export function listNames(names: string[]): string {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * One sentence for everyone present: "Alex and Sam have this post open". With
 * `withViewer`, the person reading it leads as "You".
 */
export function describePresence(
  names: string[],
  resourceType: 'post' | 'page',
  { withViewer = false }: { withViewer?: boolean } = {},
): string {
  const all = withViewer ? ['You', ...names] : names;
  const verb = all.length === 1 && !withViewer ? 'has' : 'have';
  return `${listNames(all)} ${verb} this ${resourceType} open`;
}

export function userInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
