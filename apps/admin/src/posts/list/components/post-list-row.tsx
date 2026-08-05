import {Button} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {cn, LucideIcon} from '@tryghost/shade/utils';
import {
    didPostEmailFail,
    getPostDateTooltip,
    getPostMetaParts,
    getPostStatusDetail,
    getPostStatusLabel
} from '@/posts/list/post-row-copy';
import {hasPostAnalyticsPage, type PostMetricsSettings} from '@/posts/list/post-metrics';
import {PostMetricsCells} from '@/posts/list/components/post-metrics-cells';
import {forwardRef, memo, useState} from 'react';
import type {ComponentPropsWithoutRef, MouseEvent as ReactMouseEvent} from 'react';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

interface PostListRowProps extends Omit<ComponentPropsWithoutRef<'li'>, 'onClick'> {
    post: PostListItem;
    resource: PostResource;
    timezone?: string;
    /**
     * Contributors get a link out to the live post instead of the editor, for
     * published posts they can no longer edit.
     */
    isContributor?: boolean;
    /** Owner or Administrator — the roles Ember's `isAdmin` covers. */
    hasAdminAccess?: boolean;
    paidMembersEnabled?: boolean;
    isSelected?: boolean;
    /** Capture-phase, so it beats the row's own link. */
    onSelectMouseDown?: (event: ReactMouseEvent, id: string) => void;
    onSelectClick?: (event: ReactMouseEvent) => void;
    metricsSettings: PostMetricsSettings;
    visitorCounts?: Record<string, number>;
    memberCounts?: Record<string, {free: number; paid: number}>;
}

/**
 * Status colour, following `app/styles/layouts/content.css`. Only three states
 * are coloured there — `.draft` pink (985), `.scheduled` green (992), `.error`
 * red (1017). Published and sent have **no** rule, so they inherit the muted
 * grey of `.gh-content-entry-status` (#99a3ad, ≈ `muted-foreground`). That is
 * most rows on a real site, so colouring them would change the whole feel of
 * the screen.
 *
 * Red uses Shade's semantic danger token; pink and green have no semantic
 * equivalent (a draft is not a warning, a schedule is not a success) so they
 * use the aliases that resolve to the same values Ember's `var(--pink)` and
 * `var(--green)` do.
 */
function statusTone(post: PostListItem, isFailed: boolean): string {
    if (isFailed) {
        return 'text-state-danger';
    }

    switch (post.status) {
    case 'draft':
        return 'text-pink';
    case 'scheduled':
        return 'text-green';
    default:
        return 'text-muted-foreground';
    }
}

function FeatureImage({post}: {post: PostListItem}) {
    if (post.feature_image) {
        return (
            <div
                className='size-[60px] shrink-0 rounded-md bg-surface-elevated bg-cover bg-center'
                role='presentation'
                style={{backgroundImage: `url(${post.feature_image})`}}
            />
        );
    }

    return (
        <Inline
            align='center'
            className='size-[60px] shrink-0 rounded-md bg-surface-elevated text-muted-foreground'
            justify='center'
        >
            <LucideIcon.Image className='size-5' />
        </Inline>
    );
}

const PostListRowComponent = forwardRef<HTMLLIElement, PostListRowProps>(function PostListRowComponent({
    post, resource, timezone, isContributor, hasAdminAccess, paidMembersEnabled,
    isSelected, onSelectMouseDown, onSelectClick,
    metricsSettings, visitorCounts, memberCounts,
    // Everything else lands on the <li>: the context menu wraps each row with
    // `asChild`, so Radix hands its trigger props and ref straight through.
    ...rest
}, ref) {
    const [isHovered, setIsHovered] = useState(false);

    const metaParts = getPostMetaParts(post, {timezone});
    const dateTooltip = getPostDateTooltip(post, {timezone});
    const statusLabel = getPostStatusLabel(post, resource);
    const statusDetail = getPostStatusDetail(post, {timezone, resource});
    const isFailed = didPostEmailFail(post, resource);

    // Strictly `published`, matching Ember's `isPublished`. An email-only
    // `sent` post still opens in the editor for a contributor.
    const isPublished = post.status === 'published';
    const editorType = resource === 'pages' ? 'page' : 'post';
    const linksOffsite = Boolean(isContributor && isPublished);
    const href = linksOffsite ? post.url : `#/editor/${editorType}/${post.id}`;

    const goesToAnalytics = hasPostAnalyticsPage(post, metricsSettings, resource, Boolean(hasAdminAccess));
    const action = goesToAnalytics
        ? {href: `#/posts/analytics/${post.id}`, label: 'Go to Analytics', external: false, Icon: LucideIcon.ChartNoAxesColumn}
        : linksOffsite
            // "View post" on both resources, as Ember hardcodes it. Only ever
            // reached by a contributor, who has no page access anyway.
            ? {href: post.url, label: 'View post', external: true, Icon: LucideIcon.ArrowUpRight}
            : {href, label: 'Go to Editor', external: false, Icon: LucideIcon.Pen};

    return (
        <li
            ref={ref}
            {...rest}
            className={cn(
                'group border-b border-border-default',
                // `bg-muted` is Shade's own selected-row treatment (see
                // TableRow's `data-[state=selected]`). Ember paints a 10%
                // indigo overlay, which has no semantic token here.
                // `select-none` matches Ember: a modifier-drag across rows
                // shouldn't leave text highlighted behind the selection.
                isSelected && 'bg-muted select-none'
            )}
            data-selected={isSelected ? 'true' : undefined}
            data-testid='posts-list-item'
            onClickCapture={onSelectClick}
            onMouseDownCapture={(event) => {
                onSelectMouseDown?.(event, post.id);
            }}
            onMouseEnter={() => {
                setIsHovered(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
        >
            {/* `center`, not `start`: Ember centres everything on the right
                against the 60px feature image. */}
            <Inline align='center' className='gap-4 pr-2'>
                <a
                    className='flex min-w-0 flex-1 items-start gap-4 py-4 pl-2 no-underline'
                    data-testid='post-list-item-link'
                    href={href}
                    rel={linksOffsite ? 'noopener noreferrer' : undefined}
                    target={linksOffsite ? '_blank' : undefined}
                >
                    <FeatureImage post={post} />
                    <Stack className='min-w-0 flex-1' gap='xs'>
                        <Inline align='center' gap='xs'>
                            {post.featured && (
                                <LucideIcon.Star
                                    aria-label='Featured'
                                    className='size-4 shrink-0 fill-state-warning text-state-warning'
                                    data-testid='post-featured'
                                />
                            )}
                            <Text as='h3' className='truncate' weight='semibold'>
                                {post.title}
                            </Text>
                        </Inline>

                        {metaParts.length > 0 && (
                            // Joined from parts so a missing piece takes its
                            // separator with it — no dangling " – date".
                            <Text size='sm' title={dateTooltip} tone='secondary'>
                                {metaParts.join(' - ')}
                            </Text>
                        )}

                        <Text className={statusTone(post, isFailed)} size='sm'>
                            {statusLabel}
                            {/* Mounted only while hovered, as Ember does. A CSS
                                opacity fade would keep it in the DOM, so a screen
                                reader would read every scheduled row's full
                                dispatch details aloud, always. */}
                            {isHovered && statusDetail && <span> {statusDetail}</span>}
                        </Text>
                    </Stack>
                </a>
                <PostMetricsCells
                    className='py-4'
                    memberCounts={memberCounts}
                    paidMembersEnabled={paidMembersEnabled}
                    post={post}
                    resource={resource}
                    settings={metricsSettings}
                    visitorCounts={visitorCounts}
                />
                {/* Always visible, as in Ember: `.gh-post-list-cta` is a
                    bordered white button and `.is-hovered` only changes its
                    border colour. Revealing it on hover would make it
                    undiscoverable, and an invisible target on touch. */}
                <Button
                    className='my-4 shrink-0 px-4'
                    variant='outline'
                    asChild
                >
                    <a
                        aria-label={action.label}
                        data-testid='post-list-item-action'
                        href={action.href}
                        rel={action.external ? 'noopener noreferrer' : undefined}
                        target={action.external ? '_blank' : undefined}
                        title={action.label}
                        data-ignore-select
                    >
                        <action.Icon />
                    </a>
                </Button>
            </Inline>
        </li>
    );
});

/**
 * Memoised. Selection state and modifier "select mode" both live above the
 * list, so without this every cmd-click and every press of the Cmd key
 * re-renders every row — and each row carries its own Radix hover cards, which
 * is by far the most expensive thing on the screen.
 *
 * Every prop is either a primitive or memoised upstream; `metricsSettings` in
 * particular is built with `useMemo` for this reason.
 */
export const PostListRow = memo(PostListRowComponent);
