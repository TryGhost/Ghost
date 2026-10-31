import type { ActivePresence } from './presence-api';

export interface PresentUser {
  id: string;
  name: string;
  image: string | null;
  /** Earliest heartbeat seen for this user across the given entries. */
  since: number;
}

interface StaffUserLike {
  id: string;
  name: string;
  profile_image: string | null;
}

/**
 * One row per user, named from the staff list, oldest arrival first and then
 * by name. Users the staff list does not know are left out: a ghost of an id
 * is not worth an avatar.
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
    if (!user) {
      continue;
    }
    const current = seen.get(user.id);
    if (!current) {
      seen.set(user.id, {
        id: user.id,
        name: user.name,
        image: user.profile_image,
        since: entry.ts,
      });
    } else if (entry.ts < current.since) {
      current.since = entry.ts;
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.since - b.since || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}

/** "Alex", "Alex and Sam", "Alex, Sam and Kim". */
export function listNames(names: string[]): string {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** One sentence for everyone present: "Alex and Sam have this post open". */
export function describePresence(names: string[], resourceType: 'post' | 'page'): string {
  return `${listNames(names)} ${names.length === 1 ? 'has' : 'have'} this ${resourceType} open`;
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
