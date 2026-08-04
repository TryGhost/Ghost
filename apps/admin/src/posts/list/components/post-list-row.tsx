import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {
    getPostDate,
    getPostMetaLine,
    getPostStatusDetail,
    getPostStatusLabel
} from '@/posts/list/post-row-copy';
import {formatPostTime} from '@/posts/list/post-time';
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
 * Status colour follows Ember (`app/styles/layouts/content.css`): drafts pink,
 * everything live green, failures red.
 *
 * Green and red go through Shade's semantic state tokens. Draft-pink has no
 * semantic equivalent — it isn't success, warning or danger — so it uses the
 * `pink` alias, which resolves to the same `pink-500` Ember's `var(--pink)`
 * does.
 */
function statusTone(post: PostListItem): string {
    if (post.email?.status === 'failed') {
        return 'text-state-danger';
    }

    return post.status === 'draft' ? 'text-pink' : 'text-state-success';
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
    const {byline, primaryTagName} = getPostMetaLine(post);
    const date = getPostDate(post);
    const statusLabel = getPostStatusLabel(post);
    const statusDetail = getPostStatusDetail(post, {timezone});

    const isPublished = post.status === 'published' || post.status === 'sent';
    const editorType = resource === 'pages' ? 'page' : 'post';
    const href = isContributor && isPublished
        ? post.url
        : `#/editor/${editorType}/${post.id}`;

    return (
        <li className='group border-b border-border-default' data-testid='posts-list-item'>
            <a
                className='flex items-start gap-4 px-2 py-4 no-underline transition-colors hover:bg-surface-elevated'
                href={href}
                rel={isContributor && isPublished ? 'noopener noreferrer' : undefined}
                target={isContributor && isPublished ? '_blank' : undefined}
            >
                <FeatureImage post={post} />
                <Stack className='min-w-0 flex-1' gap='xs'>
                    <Inline align='center' gap='xs'>
                        {post.featured && (
                            <LucideIcon.Star
                                aria-label='Featured'
                                className='size-4 shrink-0 fill-yellow text-yellow'
                                data-testid='post-featured'
                            />
                        )}
                        <Text as='h3' className='truncate' weight='semibold'>
                            {post.title}
                        </Text>
                    </Inline>

                    <Text size='sm' tone='secondary'>
                        {byline && <span>{byline}</span>}
                        {primaryTagName && <span> in <span className='font-medium'>{primaryTagName}</span></span>}
                        {date && (
                            <span
                                title={formatPostTime(date, {timezone, absolute: true})}
                            > – {formatPostTime(date, {timezone, absolute: true, short: true})}</span>
                        )}
                    </Text>

                    <Text className={statusTone(post)} size='sm'>
                        {statusLabel}
                        {/* Ember reveals this on hover; same idea, done with a
                            group-hover so it needs no JS state. */}
                        {statusDetail && (
                            <span className='opacity-0 transition-opacity group-hover:opacity-100'>
                                {' '}{statusDetail}
                            </span>
                        )}
                    </Text>
                </Stack>
            </a>
        </li>
    );
}
