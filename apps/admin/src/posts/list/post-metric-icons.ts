import {LucideIcon} from '@tryghost/shade/utils';
import type {PostMetricKey} from '@/posts/list/post-metrics';
import type {PostMetricRowIcon} from '@/posts/list/post-metric-tooltips';

/**
 * One icon per metric, shared by the row's columns and the hover panel.
 *
 * Ember draws the same icon in both places — `{{svg-jar "analytics-opens"}}`
 * appears in the column and in the panel beneath it — so they live in one map
 * here rather than one per component, where they could drift apart.
 *
 * These are not approximations of Ember's icons: `app/assets/icons/analytics-*`
 * are Lucide icons exported to SVG, and each entry below is the same icon its
 * file carries the class of. `analytics-paid-members.svg` is
 * `lucide-wallet-cards`, which is the one that would never have been guessed.
 */
export const POST_METRIC_ICONS: Record<PostMetricKey | PostMetricRowIcon, typeof LucideIcon.Globe> = {
    visitors: LucideIcon.Globe,
    opens: LucideIcon.MailOpen,
    clicks: LucideIcon.MousePointerClick,
    sent: LucideIcon.Send,
    members: LucideIcon.UserPlus,
    free: LucideIcon.User,
    paid: LucideIcon.WalletCards
};
