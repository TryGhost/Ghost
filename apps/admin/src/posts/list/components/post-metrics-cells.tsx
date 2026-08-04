import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {getPostClickRate, getPostMetricColumns, getPostOpenRate, type PostMetricColumn, type PostMetricsSettings} from '@/posts/list/post-metrics';
import {formatNumber} from '@tryghost/shade/utils';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

interface PostMetricsCellsProps {
    post: PostListItem;
    settings: PostMetricsSettings;
    resource: PostResource;
    /**
     * Visitor and member counts, keyed by post uuid and id respectively. These
     * arrive from separate batched requests and fill in after the row has
     * rendered — as they do in Ember, where the loads are deliberately not
     * awaited so a slow analytics service can't hold up the list.
     */
    visitorCounts?: Record<string, number>;
    memberCounts?: Record<string, {free: number; paid: number}>;
}

function metricValue(
    column: PostMetricColumn,
    post: PostListItem,
    visitorCounts?: Record<string, number>,
    memberCounts?: Record<string, {free: number; paid: number}>
): string {
    switch (column.key) {
    case 'visitors':
        return formatNumber(visitorCounts?.[post.uuid ?? ''] ?? 0);
    case 'opens':
        return `${getPostOpenRate(post)}%`;
    case 'clicks':
        return `${getPostClickRate(post)}%`;
    case 'sent':
        return formatNumber(post.email?.email_count ?? 0);
    case 'members': {
        const counts = memberCounts?.[post.id];
        return formatNumber((counts?.free ?? 0) + (counts?.paid ?? 0));
    }
    default:
        return '';
    }
}

/**
 * The right-hand metric columns. Which appear is decided by `post-metrics.ts`;
 * each links into the matching analytics tab, as Ember's do.
 */
export function PostMetricsCells({
    post, settings, resource, visitorCounts, memberCounts
}: PostMetricsCellsProps) {
    const columns = getPostMetricColumns(post, settings, resource);

    if (columns.length === 0) {
        return null;
    }

    return (
        <Inline align='center' className='shrink-0' gap='lg'>
            {columns.map(column => (
                <a
                    key={column.key}
                    className='min-w-16 text-right no-underline'
                    href={`#/posts/analytics/${post.id}/${column.tab}`}
                    // Not part of row selection — Phase 6 relies on this.
                    data-ignore-select
                >
                    <Stack align='end' gap='none'>
                        <Text weight='semibold'>
                            {metricValue(column, post, visitorCounts, memberCounts)}
                        </Text>
                        <Text size='sm' tone='secondary'>{column.label}</Text>
                    </Stack>
                </a>
            ))}
        </Inline>
    );
}
