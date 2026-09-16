import type { PostListItem } from '@/posts/list/hooks/use-posts-list';
import type { PostResource } from '@/posts/list/post-resource';
import type { EmailSendingProgressCopy } from '@/posts/email-sending-status/email-sending-status-copy';

export type PostListRowEmailStatusState =
  | { status: 'settled' }
  | { status: 'sending'; copy: EmailSendingProgressCopy }
  | { status: 'failed' };

export const SETTLED_POST_LIST_ROW_EMAIL_STATUS: PostListRowEmailStatusState = {
  status: 'settled',
};

export function hasInProgressEmail(
  post: PostListItem,
  resource: PostResource,
  improveSendingUI: boolean,
): boolean {
  return Boolean(
    improveSendingUI &&
    resource === 'posts' &&
    (post.status === 'published' || post.status === 'sent') &&
    post.email?.id &&
    (post.email.status === 'pending' || post.email.status === 'submitting'),
  );
}
