/**
 * The editor→list handoff read by `apps/admin/src/posts/list/post-publish-celebration.ts`.
 * Key names and payload shape match `publish-flow.js#setCompleted` exactly.
 */

const KEYS = {
  published: 'ghost-last-published-post',
  scheduled: 'ghost-last-scheduled-post',
} as const;

export interface PublishCelebrationHandoff {
  postId: string;
  /** 'post' or 'page' — Ember's `displayName`. */
  displayName: string;
  isScheduled: boolean;
}

export function writePublishCelebration({
  postId,
  displayName,
  isScheduled,
}: PublishCelebrationHandoff): void {
  try {
    localStorage.setItem(
      isScheduled ? KEYS.scheduled : KEYS.published,
      JSON.stringify({ id: postId, type: displayName }),
    );
  } catch {
    // A full or blocked localStorage costs the celebration, not the publish.
  }
}
