import { Inline, Text } from '@tryghost/shade/primitives';
import {
  getPostClickRate,
  getPostMetricColumns,
  getPostOpenRate,
  type PostMetricColumn,
  type PostMetricKey,
  type PostMetricsSettings,
} from '@/posts/list/post-metrics';
import { POST_METRIC_ICONS } from '@/posts/list/post-metric-icons';
import { PostMetricTooltip } from '@/posts/list/components/post-metric-tooltip';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { getPostMetricTooltip } from '@/posts/list/post-metric-tooltips';
import type { PostListItem } from '@/posts/list/hooks/use-posts-list';
import type { PostResource } from '@/posts/list/post-resource';

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
  memberCounts?: Record<string, { free: number; paid: number }>;
  paidMembersEnabled?: boolean;
  className?: string;
}

const EMAIL_KEYS: PostMetricKey[] = ['opens', 'clicks', 'sent'];

function metricValue(
  column: PostMetricColumn,
  post: PostListItem,
  visitorCounts?: Record<string, number>,
  memberCounts?: Record<string, { free: number; paid: number }>,
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
  post,
  settings,
  resource,
  visitorCounts,
  memberCounts,
  paidMembersEnabled,
  className,
}: PostMetricsCellsProps) {
  const columns = getPostMetricColumns(post, settings, resource);
  const shown = new Set(columns.map((column) => column.key));
  const members = memberCounts?.[post.id];

  if (columns.length === 0) {
    return null;
  }

  const groups: PostMetricColumn[][] = [];

  columns.forEach((column) => {
    const previous = groups[groups.length - 1];
    const joinsPrevious =
      EMAIL_KEYS.includes(column.key) &&
      previous !== undefined &&
      EMAIL_KEYS.includes(previous[0].key);

    if (joinsPrevious) {
      previous.push(column);
    } else {
      groups.push([column]);
    }
  });

  return (
    // Hidden below 1200px, as Ember hides `.gh-post-list-metrics-container`
    // at the same width: on a narrow window there is no room for both the
    // title and four columns, and Ember's answer is to drop the columns
    // rather than let them crowd the title.
    //
    // The literal 1200 rather than a named breakpoint: Shade's nearest is
    // `sidebarlg` at 1240px, which exists to describe the sidebar and would
    // tie this rule to something it has nothing to do with.
    <Inline align="center" className={cn('shrink-0 max-[1200px]:hidden', className)} gap="md">
      {groups.map((group) => {
        const tooltip = getPostMetricTooltip(group[0].key, post, {
          visitors: visitorCounts?.[post.uuid ?? ''],
          freeMembers: members?.free,
          paidMembers: members?.paid,
          paidMembersEnabled,
          showOpens: shown.has('opens'),
          showClicks: shown.has('clicks'),
        });

        return (
          <PostMetricTooltip key={group[0].key} rows={tooltip.rows} title={tooltip.title}>
            <Inline align="center" gap="md">
              {group.map((column) => {
                const Icon = POST_METRIC_ICONS[column.key];
                const value = metricValue(column, post, visitorCounts, memberCounts);

                return (
                  <a
                    key={column.key}
                    // Named for assistive tech, because the
                    // column no longer says what it is: the
                    // icon replaced the text label, and an
                    // unlabelled icon beside a bare number
                    // is "0%" with no subject. Ember titles
                    // its icons for the same reason.
                    aria-label={`${column.label}: ${value}`}
                    // A fixed floor on the width so the
                    // figures line up in columns down the
                    // list and can be scanned. It is a
                    // *minimum*, so a long value like
                    // "1,000" grows the block rather than
                    // being clipped.
                    //
                    // It costs even spacing, and that trade
                    // is deliberate: with the content
                    // right-aligned inside the box, a short
                    // value leaves slack on its left, so
                    // the space you see between two blocks
                    // is the 12px gap plus that slack while
                    // the space to the button is a true
                    // 12px. Scannable columns are worth
                    // more here than an even rhythm.
                    className="min-w-16 no-underline"
                    href={`#/posts/analytics/${post.id}/${column.tab}`}
                    title={column.label}
                    // Not part of row selection — Phase 6 relies on this.
                    data-ignore-select
                  >
                    <Inline align="center" gap="xs" justify="end">
                      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                      {/* Small and unbolded, as Ember's
                                                are — its `.gh-post-list-analytics-metric`
                                                is midgrey at normal weight. The
                                                figures are secondary to the
                                                title, not competing with it. */}
                      <Text className="font-mono" size="sm">
                        {value}
                      </Text>
                    </Inline>
                  </a>
                );
              })}
            </Inline>
          </PostMetricTooltip>
        );
      })}
    </Inline>
  );
}
