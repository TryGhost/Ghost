import { formatDisplayDate, formatDisplayTime, formatNumber } from '@tryghost/shade/utils';
import { isEmailOnly } from '@tryghost/admin-x-framework';
import type { Post } from '@tryghost/admin-x-framework/api/posts';

interface PostBylineOptions {
  /** From the email sending status provider. */
  isEmailSent: boolean;
  /** Adds the recipient count and holds "Sent" back until the send finishes. */
  improveSendingUI: boolean;
  timezone: string;
}

/** When and how a post went out, shown under its title in post analytics. */
export function getPostByline(
  post: Post,
  { isEmailSent, improveSendingUI, timezone }: PostBylineOptions,
): string | null {
  if (!post.published_at) {
    return null;
  }

  const publishedAt = `on ${formatDisplayDate(post.published_at, timezone)} at ${formatDisplayTime(post.published_at, timezone)}`;
  // Only a finished send's recipient count is final.
  const emailCount = post.email?.email_count ?? 0;
  const recipients =
    improveSendingUI && isEmailSent && emailCount > 0
      ? ` to ${formatNumber(emailCount)} ${emailCount === 1 ? 'member' : 'members'}`
      : '';

  if (isEmailOnly(post)) {
    // An unfinished send is reported by the status line under the title.
    return isEmailSent || !improveSendingUI ? `Sent${recipients} ${publishedAt}` : null;
  }

  if (post.status === 'published') {
    return isEmailSent
      ? `Published and sent${recipients} ${publishedAt}`
      : `Published on your site ${publishedAt}`;
  }

  return null;
}
