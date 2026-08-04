import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {getPostClickRate, getPostMetricColumns, getPostOpenRate, type PostMetricColumn, type PostMetricKey, type PostMetricsSettings} from '@/posts/list/post-metrics';
import {PostMetricTooltip} from '@/posts/list/components/post-metric-tooltip';
import {cn, formatNumber} from '@tryghost/shade/utils';
import {getPostMetricTooltip} from '@/posts/list/post-metric-tooltips';
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
    paidMembersEnabled?: boolean;
    className?: string;
}

const EMAIL_KEYS: PostMetricKey[] = ['opens', 'clicks', 'sent'];

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
 *
 * The columns are grouped before rendering because the hover panel belongs to
 * the *group*, not the column: Ember hangs one "Newsletter performance" tooltip
 * off the wrapper around Opens, Clicks and Sent. One trigger per column would
 * flash the identical panel closed and open again as the pointer crossed from
 * Opens to Clicks.
 */
export function PostMetricsCells({
    post, settings, resource, visitorCounts, memberCounts, paidMembersEnabled, className
}: PostMetricsCellsProps) {
    const columns = getPostMetricColumns(post, settings, resource);
    const shown = new Set(columns.map(column => column.key));
    const members = memberCounts?.[post.id];

    if (columns.length === 0) {
        return null;
    }

    const groups: PostMetricColumn[][] = [];

    columns.forEach((column) => {
        const previous = groups[groups.length - 1];
        const joinsPrevious = EMAIL_KEYS.includes(column.key)
            && previous !== undefined
            && EMAIL_KEYS.includes(previous[0].key);

        if (joinsPrevious) {
            previous.push(column);
        } else {
            groups.push([column]);
        }
    });

    return (
        <Inline align='center' className={cn('shrink-0', className)} gap='lg'>
            {groups.map((group) => {
                const tooltip = getPostMetricTooltip(group[0].key, post, {
                    visitors: visitorCounts?.[post.uuid ?? ''],
                    freeMembers: members?.free,
                    paidMembers: members?.paid,
                    paidMembersEnabled,
                    showOpens: shown.has('opens'),
                    showClicks: shown.has('clicks')
                });

                return (
                    <PostMetricTooltip key={group[0].key} rows={tooltip.rows} title={tooltip.title}>
                        <Inline align='center' gap='lg'>
                            {group.map(column => (
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
                    </PostMetricTooltip>
                );
            })}
        </Inline>
    );
}
