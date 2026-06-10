import PostsListItemAnalytics from './posts-list-item-analytics';
import React from 'react';
import moment from 'moment-timezone';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import type {Post} from '@tryghost/admin-x-framework/api/posts';
import type {PostsListAnalyticsContext} from './posts-list-item-analytics';
import type {PostsResource} from '../posts-query-params';

export function getEditorHref(resource: PostsResource, id?: string): string {
    const type = resource === 'pages' ? 'page' : 'post';
    return id ? `#/editor/${type}/${id}` : `#/editor/${type}`;
}

/**
 * Ember parity: gh-format-post-time with `absolute=true` (+ optional `short`),
 * as used by the posts list meta line
 */
export function formatPostTime(time: string, timezone: string, {short = false}: {short?: boolean} = {}): string {
    const value = moment.tz(time, timezone);
    const now = moment.tz(moment.utc(), timezone);

    let utcOffset;
    if (value.utcOffset() === 0) {
        utcOffset = '(UTC)';
    } else {
        utcOffset = `(UTC${value.format('Z').replace(/([+-])0/, '$1').replace(/:00/, '')})`;
    }

    // Within 12 hours → relative time ("2 hours ago")
    if (Math.abs(now.diff(value, 'hours')) <= 12) {
        return value.from(now);
    }

    // Same day → time + Today
    if (value.isSame(now, 'day')) {
        return value.format(`HH:mm [${utcOffset}] [Today]`);
    }

    // Yesterday → just "Yesterday" in short format
    if (value.isSame(now.clone().subtract(1, 'days').startOf('day'), 'day')) {
        return short ? 'Yesterday' : value.format(`HH:mm [${utcOffset}] [yesterday]`);
    }

    return value.format(short ? 'DD MMM YYYY' : `HH:mm [${utcOffset}] DD MMM YYYY`);
}

/**
 * Colored status line (Ember parity: .gh-content-entry-status in
 * posts-list/list-item.hbs) — green Scheduled, pink Draft, grey
 * Published/Sent with email failures in red
 */
function PostStatus({post}: {post: Post}) {
    const emailFailed = !!post.email && post.email.status === 'failed';

    let label: string;
    let className = 'text-muted-foreground';

    switch (post.status) {
    case 'scheduled':
        label = 'Scheduled';
        className = 'font-medium text-[#30cf43]';
        break;
    case 'draft':
        label = 'Draft';
        className = 'font-medium text-[#fb2d8d]';
        break;
    case 'sent':
        label = emailFailed ? 'Failed to send newsletter' : 'Sent';
        if (emailFailed) {
            className = 'font-medium text-[#f50b23]';
        }
        break;
    default:
        if (emailFailed) {
            label = 'Published but failed to send newsletter';
            className = 'font-medium text-[#f50b23]';
        } else if (post.email) {
            label = 'Published and sent';
        } else {
            label = 'Published';
        }
        break;
    }

    return (
        <p className={cn('mt-0.5 truncate text-sm', className)} data-testid="post-status">
            {label}
        </p>
    );
}

interface PostsListItemProps {
    post: Post;
    resource: PostsResource;
    /** Site timezone used to format the meta line dates */
    timezone: string;
    selected: boolean;
    selectionEnabled: boolean;
    /** When set, analytics metrics are rendered on published/sent rows (posts only) */
    analytics?: PostsListAnalyticsContext;
    onToggleSelect: (id: string) => void;
    onShiftSelect: (id: string) => void;
    onOpen: (post: Post) => void;
    onContextMenu: (post: Post, event: React.MouseEvent) => void;
}

// Memoized so selection changes only re-render the affected rows — the list
// passes stable callbacks and a memoized analytics object
const PostsListItem = React.memo(function PostsListItem({
    post,
    resource,
    timezone,
    selected,
    selectionEnabled,
    analytics,
    onToggleSelect,
    onShiftSelect,
    onOpen,
    onContextMenu
}: PostsListItemProps) {
    const editorHref = getEditorHref(resource, post.id);
    const authorNames = post.authors?.map(author => author.name).filter(Boolean).join(', ');
    const isDraftLike = post.status === 'draft' || post.status === 'scheduled';
    const dateValue = isDraftLike ? (post.updated_at ?? post.published_at) : (post.published_at ?? post.updated_at);
    const formattedDate = dateValue ? formatPostTime(dateValue, timezone, {short: true}) : '';
    const dateTitle = dateValue
        ? `${isDraftLike ? 'Updated' : 'Published'} ${formatPostTime(dateValue, timezone)}`
        : undefined;

    // Ember parity: published/sent posts link to analytics from the row
    // button; everything else gets the edit pencil
    const showAnalyticsCta = !!analytics && (post.status === 'published' || post.status === 'sent');

    const handleClick = (event: React.MouseEvent) => {
        if (selectionEnabled && event.shiftKey) {
            event.preventDefault();
            onShiftSelect(post.id);
            return;
        }
        if (selectionEnabled && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onToggleSelect(post.id);
            return;
        }
        event.preventDefault();
        onOpen(post);
    };

    return (
        <div
            className={cn(
                'group cursor-pointer border-b px-2 py-4 transition-colors hover:bg-muted/50',
                selected && 'bg-accent hover:bg-accent'
            )}
            data-selected={selected || undefined}
            role="menuitem"
            onClick={handleClick}
            onContextMenu={event => onContextMenu(post, event)}
        >
            <div className="flex items-center justify-between gap-4" data-testid="posts-list-item">
                <div className="flex min-w-0 items-start gap-5">
                    {/* Feature image thumbnail (Ember parity: .gh-post-list-feature-image) */}
                    <div
                        className="flex aspect-[16/10] w-[100px] shrink-0 items-center justify-center rounded-[5px] bg-[#F8F8FA] bg-cover bg-center dark:bg-muted"
                        style={post.feature_image ? {backgroundImage: `url(${post.feature_image})`} : undefined}
                    >
                        {!post.feature_image && (
                            <LucideIcon.Image className="size-[18px] text-muted-foreground opacity-50" />
                        )}
                    </div>
                    <div className="min-w-0">
                        {/* The row click handler always calls preventDefault, so this link never double-navigates */}
                        <a className="block min-w-0" href={editorHref}>
                            <h3 className="truncate text-md font-semibold">
                                {post.featured && (
                                    <LucideIcon.Star
                                        aria-label="star-fill"
                                        className="mr-1.5 mb-0.5 inline-block size-3.5 fill-amber-400 text-amber-400"
                                        role="img"
                                    />
                                )}
                                {post.title}
                            </h3>
                        </a>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                            {authorNames && <span>By {authorNames}</span>}
                            {post.primary_tag && <span> in {post.primary_tag.name}</span>}
                            {formattedDate && <span title={dateTitle}>{authorNames ? ' - ' : ''}{formattedDate}</span>}
                        </p>
                        <PostStatus post={post} />
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                    {analytics && (post.status === 'published' || post.status === 'sent') && (
                        <PostsListItemAnalytics analytics={analytics} post={post} />
                    )}
                    {/* Row CTA button (Ember parity: .gh-post-list-cta) */}
                    <a
                        className="flex h-[34px] w-[52px] shrink-0 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:border-foreground/25"
                        href={showAnalyticsCta ? `#/posts/analytics/${post.id}` : editorHref}
                        title={showAnalyticsCta ? 'Go to Analytics' : 'Go to Editor'}
                        onClick={event => event.stopPropagation()}
                    >
                        {showAnalyticsCta ? (
                            <LucideIcon.ChartColumn className="size-[14px]" />
                        ) : (
                            <LucideIcon.Pen className="size-[14px]" />
                        )}
                    </a>
                </div>
            </div>
        </div>
    );
});

export default PostsListItem;
