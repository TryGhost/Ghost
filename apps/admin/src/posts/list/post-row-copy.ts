import {formatNumber} from '@tryghost/shade/utils';
import {formatPostTime} from '@/posts/list/post-time';
import {humanizeRecipientFilter} from '@/posts/list/humanize-recipient-filter';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';

/**
 * Every string a post row renders, as pure functions.
 *
 * Ported from `apps/ember-admin/app/components/posts-list/list-item-analytics.hbs`
 * and its helpers. Kept out of the component because this is where parity
 * actually lives — the wording and the conditions behind it are far easier to
 * get subtly wrong than the layout, and far harder to eyeball.
 */

type PostStatus = 'draft' | 'scheduled' | 'published' | 'sent';

function statusOf(post: PostListItem): PostStatus {
    return (post.status ?? 'draft') as PostStatus;
}

function didEmailFail(post: PostListItem): boolean {
    return post.email?.status === 'failed';
}

function wasEmailed(post: PostListItem): boolean {
    return Boolean(post.email) && !didEmailFail(post);
}

/** Comma-joined author names, falling back to the email for un-named staff. */
export function getPostAuthorNames(post: PostListItem): string {
    return (post.authors ?? [])
        .map(author => author.name || author.email)
        .filter(Boolean)
        .join(', ');
}

/**
 * Drafts and scheduled posts have no meaningful publish date, so the list
 * shows when they were last touched instead.
 */
export function getPostDateField(post: PostListItem): 'updated_at' | 'published_at' {
    const status = statusOf(post);

    return status === 'draft' || status === 'scheduled' ? 'updated_at' : 'published_at';
}

export function getPostDate(post: PostListItem): string | undefined {
    return getPostDateField(post) === 'updated_at' ? post.updated_at : post.published_at;
}

export interface PostMetaLine {
    /** "By Ada, Grace" — null when the post has no authors at all. */
    byline: string | null;
    primaryTagName: string | null;
}

export function getPostMetaLine(post: PostListItem): PostMetaLine {
    const authors = getPostAuthorNames(post);

    return {
        byline: authors ? `By ${authors}` : null,
        primaryTagName: post.primary_tag?.name ?? null
    };
}

/** The always-visible status text. */
export function getPostStatusLabel(post: PostListItem): string {
    switch (statusOf(post)) {
    case 'scheduled':
        return 'Scheduled';
    case 'published':
        if (didEmailFail(post)) {
            return 'Published but failed to send newsletter';
        }
        return wasEmailed(post) ? 'Published and sent' : 'Published';
    case 'sent':
        return didEmailFail(post) ? 'Failed to send newsletter' : 'Sent';
    default:
        return 'Draft';
    }
}

export interface PostStatusDetailOptions {
    timezone?: string;
    now?: Date;
}

/**
 * The extra text Ember reveals on hover: who a scheduled post will go to, or
 * how many members already received it. `null` when there is nothing to add.
 */
export function getPostStatusDetail(
    post: PostListItem,
    {timezone, now}: PostStatusDetailOptions = {}
): string | null {
    const status = statusOf(post);

    if (status === 'scheduled') {
        const when = formatPostTime(post.published_at, {timezone, scheduled: true, now});
        const segment = post.email_segment
            ? ` to ${humanizeRecipientFilter(post.email_segment)}`
            : '';

        // Email-only posts are never "published".
        if (post.email_only) {
            return `to be sent ${when}${segment}`.trim();
        }

        const andSent = post.newsletter ? ' and sent' : '';
        const recipients = post.newsletter ? segment : '';

        return `to be published${andSent} ${when}${recipients}`.trim();
    }

    if ((status === 'published' || status === 'sent') && wasEmailed(post)) {
        const count = post.email?.email_count ?? 0;
        return `to ${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`;
    }

    return null;
}
