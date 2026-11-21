import getHandle from './get-handle';
import { Activity } from '../api/activitypub';
import { ActorProperties } from '@tryghost/admin-x-framework/api/activitypub';

export interface GroupedActivity {
  /** The newest activity for the post in the list */
  activity: Activity;
  /** Everyone in the list who reposted the post, newest first */
  reposters: ActorProperties[];
}

/**
 * Folds the repeats of a post in a timeline into one item. The API lists a post
 * once per activity (the post itself, and each repost of it), so a post that
 * several followed accounts reposted shows up several times.
 *
 * Timelines are newest first, so a post keeps the position where it first
 * appears; later copies only add their reposter.
 */
export function groupReposts(activities: Activity[]): GroupedActivity[] {
  const grouped = new Map<string, GroupedActivity>();

  for (const activity of activities) {
    const reposter: ActorProperties | null = activity.type === 'Announce' ? activity.actor : null;
    const existing = grouped.get(activity.id);

    if (!existing) {
      grouped.set(activity.id, { activity, reposters: reposter ? [reposter] : [] });
      continue;
    }

    if (!reposter) {
      continue;
    }

    const reposterHandle = getHandle(reposter).toLowerCase();
    if (!existing.reposters.some((known) => getHandle(known).toLowerCase() === reposterHandle)) {
      existing.reposters.push(reposter);
    }
  }

  return Array.from(grouped.values());
}
