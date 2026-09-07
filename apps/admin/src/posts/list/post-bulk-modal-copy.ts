import type { PostResource } from '@/posts/list/post-resource';

/**
 * Wording for the three confirmation modals, ported from
 * `apps/ember-admin/app/components/posts-list/modals/{delete,unpublish,unschedule}-posts.hbs`.
 */

export type BulkConfirmKey = 'delete' | 'unpublish' | 'unschedule';

interface CopyInputs {
  /** The selection count — after Cmd+A, the server total. */
  count: number;
  resource: PostResource;
  /** The single post's title, used only when exactly one is selected. */
  title?: string;
  /**
   * Ember's `isSingle`: one id selected *and not inverted*. Cmd+A on a
   * one-post view is an inverted selection of one, and Ember still says
   * "these posts" — so this is not derivable from the count. Defaults to
   * count === 1 for callers with no inverted selection to worry about.
   */
  isSingle?: boolean;
}

const LABELS: Record<BulkConfirmKey, { confirm: string; running: string }> = {
  delete: { confirm: 'Delete', running: 'Deleting' },
  unpublish: { confirm: 'Unpublish', running: 'Unpublishing' },
  unschedule: { confirm: 'Unschedule', running: 'Unscheduling' },
};

export function getBulkConfirmCopy(
  key: BulkConfirmKey,
  { count, resource, title, isSingle = count === 1 }: CopyInputs,
) {
  const noun = resource === 'pages' ? 'page' : 'post';
  const subject = isSingle ? `this ${noun}` : `these ${noun}s`;
  // A single post is named; several are counted.
  const target = isSingle ? (title ? `"${title}"` : `this ${noun}`) : `${count} ${noun}s`;

  // Unpublish and unschedule share a body — both revert to a private draft —
  // and neither carries the permanence warning, because neither is permanent.
  const body =
    key === 'delete'
      ? `You’re about to delete ${target}. This is permanent! We warned you, k?`
      : `You’re about to revert ${target} to a private draft.`;

  return {
    title: `Are you sure you want to ${key} ${subject}?`,
    body,
    confirmLabel: LABELS[key].confirm,
    runningLabel: LABELS[key].running,
  };
}

/**
 * The Change access modal's heading, ported from `edit-posts-access.hbs`. The
 * count is appended only when the selection is not single — same `isSingle`
 * rule as the confirmations above, so an inverted selection of one still counts.
 */
export function getAccessModalTitle({
  count,
  resource,
  isSingle,
}: {
  count: number;
  resource: PostResource;
  isSingle: boolean;
}): string {
  const noun = resource === 'pages' ? 'page' : 'post';

  return isSingle ? `Change ${noun} access` : `Change ${noun} access for ${count} ${noun}s`;
}
