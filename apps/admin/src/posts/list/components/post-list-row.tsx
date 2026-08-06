import {Button} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {cn, LucideIcon} from '@tryghost/shade/utils';
import FeatureImagePlaceholder from '@/shared/feature-image-placeholder';
import {PostsContextMenu} from '@/posts/list/components/posts-context-menu';
import type {PostContextMenuItem, PostContextMenuKey} from '@/posts/list/post-context-menu-items';
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
    /**
     * The right-click menu is rendered *inside* this component rather than
     * wrapped around it. A wrapper's `children` is a fresh React element on
     * every parent render, so `memo` on the wrapper can never hold and the
     * whole list re-renders on every selection change. Rendering it here puts
     * the menu's children inside this memo boundary instead.
     *
     * These props are all primitives or ref-stable getters for the same reason.
     */
    getMenuItems: () => PostContextMenuItem[];
    showGiftLink?: boolean;
    menuEnabled?: boolean;
    menuOnOpenChange?: (open: boolean) => void;
    menuOnAction?: (key: PostContextMenuKey) => void | Promise<void>;
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

/**
 * The thumbnail, matched to the analytics dashboard's: a 16/10 landscape
 * thumbnail rather than the square this list used to draw, at the same widths
 * and corner radius. Ember's own list is 16/10 too, so this lands on both at
 * once.
 *
 * The empty state is analytics' shared placeholder component rather than a
 * restyle of it, so the two lists cannot drift apart.
 */
const FEATURE_IMAGE_GEOMETRY = 'aspect-[16/10] w-[80px] shrink-0 rounded-sm lg:w-[100px]';

function FeatureImage({post}: {post: PostListItem}) {
    if (post.feature_image) {
        return (
            <div
                className={cn(FEATURE_IMAGE_GEOMETRY, 'bg-muted bg-cover bg-center')}
                role='presentation'
                style={{backgroundImage: `url(${post.feature_image})`}}
            />
        );
    }

    // `p-0` because the placeholder's own padding is sized for a larger box;
    // here the icon just centres in the thumbnail.
    return <FeatureImagePlaceholder className={cn(FEATURE_IMAGE_GEOMETRY, 'p-0')} />;
}

const PostListRowComponent = forwardRef<HTMLLIElement, PostListRowProps>(function PostListRowComponent({
    post, resource, timezone, isContributor, hasAdminAccess, paidMembersEnabled,
    isSelected, onSelectMouseDown, onSelectClick,
    getMenuItems, showGiftLink, menuEnabled, menuOnOpenChange, menuOnAction,
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

    const row = (
        <li
            ref={ref}
            {...rest}
            className={cn(
                'group border-b border-border-default',
                // A light blue rather than a grey: selection is a different
                // kind of state from hover, and two greys a step apart read as
                // degrees of the same thing. Ember paints a 10% indigo overlay
                // for the same reason.
                //
                // `select-none` matches Ember: a modifier-drag across rows
                // shouldn't leave text highlighted behind the selection.
                //
                // Hover applies only when the row is *not* selected — a hover
                // rule would otherwise outrank the selected background and make
                // the row under the cursor look deselected.
                isSelected ? 'bg-table-row-selected select-none' : 'hover:bg-table-row-hover'
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
                against the feature image.

                Padding is even on all four sides. It lives on the children
                rather than the row because the link and the trailing button
                each need to fill the row's full height to stay clickable —
                so the row's own box has to stay flush. */}
            <Inline align='center' className='gap-4 pr-4'>
                <a
                    className='flex min-w-0 flex-1 items-start gap-4 py-4 pl-4 no-underline'
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
                    // `bg-control-surface` rather than a bare white: it is
                    // white in light mode and transparent in dark, so the
                    // button sits on the row instead of punching a pale hole
                    // through it. Without it the outline variant is see-through
                    // and picks up the blue of a selected row.
                    className='my-4 shrink-0 bg-control-surface px-4'
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

    return (
        <PostsContextMenu
            enabled={menuEnabled ?? false}
            getItems={getMenuItems}
            showGiftLink={showGiftLink ?? false}
            onAction={menuOnAction ?? (() => {})}
            onOpenChange={menuOnOpenChange ?? (() => {})}
        >
            {row}
        </PostsContextMenu>
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
