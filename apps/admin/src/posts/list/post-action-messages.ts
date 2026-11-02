import type { PostResource } from '@/posts/list/post-resource';

/**
 * Toast wording for post actions.
 *
 * A table rather than inline strings because these are the only feedback a bulk
 * action gives, and the singular and plural forms differ in ways that aren't
 * derivable from each other — `accessUpdated` reorders its clauses, and the two
 * copy messages have no plural at all.
 */

export type PostActionMessageKey =
  | 'deleted'
  | 'unpublished'
  | 'unscheduled'
  | 'accessUpdated'
  | 'tagsAdded'
  | 'tagAdded'
  | 'duplicated'
  | 'copiedPostUrl'
  | 'copiedPreviewUrl';

interface MessageForms {
  single: string;
  /** Absent where the action is single-only. */
  multiple?: string;
}

const MESSAGES: Record<PostActionMessageKey, MessageForms> = {
  deleted: { single: '{Type} deleted', multiple: '{count} {type}s deleted' },
  unpublished: {
    single: '{Type} reverted to a draft',
    multiple: '{count} {type}s reverted to drafts',
  },
  unscheduled: { single: '{Type} unscheduled', multiple: '{count} {type}s unscheduled' },
  // Leads with the type rather than the count, unlike every other plural.
  accessUpdated: {
    single: '{Type} access updated',
    multiple: '{Type} access updated for {count} {type}s',
  },
  tagsAdded: { single: 'Tags added', multiple: 'Tags added to {count} {type}s' },
  tagAdded: { single: 'Tag added', multiple: 'Tag added to {count} {type}s' },
  duplicated: { single: '{Type} duplicated', multiple: '{count} {type}s duplicated' },
  // "Post" even on a page.
  copiedPostUrl: { single: 'Post link copied' },
  copiedPreviewUrl: { single: 'Preview link copied' },
};

export function getPostActionMessage(
  key: PostActionMessageKey,
  {
    count,
    resource,
    isSingle = count === 1,
  }: {
    count: number;
    resource: PostResource;
    /**
     * Branches on `isSingle`, not on the count — the same
     * predicate the confirmation modal uses. Without it the modal can say
     * "these posts" and the toast that follows say "Post deleted".
     */
    isSingle?: boolean;
  },
): string {
  const forms = MESSAGES[key];
  // Falls back to the singular where there is no plural, rather than
  // interpolating `undefined` into the toast.
  const template = (isSingle ? forms.single : forms.multiple) ?? forms.single;

  const type = resource === 'pages' ? 'page' : 'post';

  return template
    .replace(/\{Type\}/g, type.charAt(0).toUpperCase() + type.slice(1))
    .replace(/\{type\}/g, type)
    .replace(/\{count\}/g, String(count));
}
