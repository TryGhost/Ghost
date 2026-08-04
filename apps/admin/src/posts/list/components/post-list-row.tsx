import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {
    didPostEmailFail,
    getPostDateTooltip,
    getPostMetaParts,
    getPostStatusDetail,
    getPostStatusLabel
} from '@/posts/list/post-row-copy';
import {useState} from 'react';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

interface PostListRowProps {
    post: PostListItem;
    resource: PostResource;
    timezone?: string;
    /**
     * Contributors get a link out to the live post instead of the editor, for
     * published posts they can no longer edit.
     */
    isContributor?: boolean;
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

export function PostListRow({post, resource, timezone, isContributor}: PostListRowProps) {
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

    return (
        <li
            className='group border-b border-border-default'
            data-testid='posts-list-item'
            onMouseEnter={() => {
                setIsHovered(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
        >
            <a
                className='flex items-start gap-4 px-2 py-4 no-underline transition-colors hover:bg-surface-elevated'
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
        </li>
    );
}
