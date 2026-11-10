import { LucideIcon } from '@tryghost/shade/utils';
import type { PostMetricKey } from '@/posts/list/post-metrics';
import type { PostMetricRowIcon } from '@/posts/list/post-metric-tooltips';

/**
 * One icon per metric, shared by the row's columns and the hover panel. One map
 * rather than one per component, so the two can't drift apart.
 */
export const POST_METRIC_ICONS: Record<PostMetricKey | PostMetricRowIcon, typeof LucideIcon.Globe> =
  {
    visitors: LucideIcon.Globe,
    opens: LucideIcon.MailOpen,
    clicks: LucideIcon.MousePointerClick,
    sent: LucideIcon.Send,
    members: LucideIcon.UserPlus,
    free: LucideIcon.User,
    paid: LucideIcon.WalletCards,
  };
