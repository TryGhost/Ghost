import type { PostMetricKey } from '@/posts/list/post-metrics';
import type { PostListItem } from '@/posts/list/hooks/use-posts-list';

/**
 * The breakdown shown when hovering a metric column, ported from the tooltip
 * markup in `list-item-analytics.hbs`.
 *
 * The three email columns share one tooltip — Ember shows the same "Newsletter
 * performance" panel with Sent, Opens and Clicks whichever of them you hover,
 * and it lists Opens/Clicks only when those are being tracked.
 *
 * The panel shows **raw counts**, not the rates the columns show: the Opens
 * column reads "78%" while the panel underneath it reads "Opens 572". Showing
 * the rate in both places would be a plausible-looking lie.
 */

/**
 * Which icon a row carries. A name rather than a component, so this module
 * stays plain TypeScript — it is the one the unit tests lean on — and the
 * component owns the mapping to actual icons.
 */
export type PostMetricRowIcon = 'visitors' | 'sent' | 'opens' | 'clicks' | 'free' | 'paid';

export interface PostMetricTooltipRow {
  label: string;
  value: number;
  icon: PostMetricRowIcon;
}

export interface PostMetricTooltipContent {
  title: string;
  rows: PostMetricTooltipRow[];
}

export interface TooltipInputs {
  visitors?: number;
  freeMembers?: number;
  paidMembers?: number;
  /** Whether the site shows paid figures at all. */
  paidMembersEnabled?: boolean;
  showOpens: boolean;
  showClicks: boolean;
}

export function getPostMetricTooltip(
  key: PostMetricKey,
  post: PostListItem,
  inputs: TooltipInputs,
): PostMetricTooltipContent {
  if (key === 'visitors') {
    return {
      title: 'Web traffic',
      rows: [{ label: 'Unique visitors', value: inputs.visitors ?? 0, icon: 'visitors' }],
    };
  }

  if (key === 'opens' || key === 'clicks' || key === 'sent') {
    const sent = post.email?.email_count ?? 0;

    return {
      title: 'Newsletter performance',
      rows: [
        { label: 'Sent', value: sent, icon: 'sent' },
        ...(inputs.showOpens
          ? [{ label: 'Opens', value: post.email?.opened_count ?? 0, icon: 'opens' as const }]
          : []),
        ...(inputs.showClicks
          ? [{ label: 'Clicks', value: post.count?.clicks ?? 0, icon: 'clicks' as const }]
          : []),
      ],
    };
  }

  // `members` — and the only remaining key, so this is the total case rather
  // than a branch with a null fallback.
  return {
    title: 'New members',
    rows: [
      { label: 'Free', value: inputs.freeMembers ?? 0, icon: 'free' },
      // Ember hides the paid row entirely when paid members are off.
      ...(inputs.paidMembersEnabled
        ? [{ label: 'Paid', value: inputs.paidMembers ?? 0, icon: 'paid' as const }]
        : []),
    ],
  };
}
