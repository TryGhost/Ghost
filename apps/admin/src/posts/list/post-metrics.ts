import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

/**
 * Which metric columns a row shows, and where each links.
 *
 * Ported from `list-item-analytics.hbs` plus the `showEmailOpenAnalytics`,
 * `showEmailClickAnalytics` and `showAttributionAnalytics` computeds in
 * `apps/ember-admin/app/models/post.js`.
 *
 * Two rules are easy to get wrong and invisible unless a site is configured a
 * particular way: **Sent is a fallback**, shown only when neither Opens nor
 * Clicks is; and the email columns need tracking enabled *both* site-wide and
 * on the individual email, because a post sent before the setting changed
 * carries its own flags.
 */

export type PostMetricKey = 'visitors' | 'opens' | 'clicks' | 'sent' | 'members';

export interface PostMetricsSettings {
    webAnalyticsEnabled: boolean;
    membersTrackSources: boolean;
    emailTrackOpens: boolean;
    emailTrackClicks: boolean;
    /** `'none'` means memberships are off, which hides email engagement. */
    membersSignupAccess: string;
    isMembersInviteOnly: boolean;
    isContributor: boolean;
}

export interface PostMetricColumn {
    key: PostMetricKey;
    label: string;
    /** Which analytics tab the column links to. */
    tab: 'web' | 'newsletter' | 'growth';
}

const COLUMNS: Record<PostMetricKey, Omit<PostMetricColumn, 'key'>> = {
    visitors: {label: 'Visitors', tab: 'web'},
    opens: {label: 'Opens', tab: 'newsletter'},
    clicks: {label: 'Clicks', tab: 'newsletter'},
    sent: {label: 'Sent', tab: 'newsletter'},
    members: {label: 'Members', tab: 'growth'}
};

function wasEmailed(post: PostListItem): boolean {
    const status = post.status;

    return (status === 'published' || status === 'sent')
        && Boolean(post.email)
        && post.email?.status !== 'failed';
}

export function getPostMetricColumns(
    post: PostListItem,
    settings: PostMetricsSettings,
    resource: PostResource
): PostMetricColumn[] {
    // Contributors get no analytics at all.
    if (settings.isContributor) {
        return [];
    }

    const keys: PostMetricKey[] = [];
    const isPublished = post.status === 'published';
    const membersEnabled = settings.membersSignupAccess !== 'none';

    if (settings.webAnalyticsEnabled && isPublished) {
        keys.push('visitors');
    }

    if (wasEmailed(post)) {
        // Both the site setting and the email's own flag, since an email sent
        // before the setting changed keeps the flags it was sent with.
        const showOpens = membersEnabled && settings.emailTrackOpens && post.email?.track_opens === true;
        const showClicks = membersEnabled && settings.emailTrackClicks && post.email?.track_clicks === true;

        if (showOpens) {
            keys.push('opens');
        }

        if (showClicks) {
            keys.push('clicks');
        }

        // Fallback only — the raw count stands in when neither rate is shown.
        if (!showOpens && !showClicks) {
            keys.push('sent');
        }
    }

    // Pages are never email-only, so that exclusion doesn't apply to them.
    const notEmailOnly = resource === 'pages' || !post.email_only;

    if (settings.membersTrackSources && isPublished && notEmailOnly && !settings.isMembersInviteOnly) {
        keys.push('members');
    }

    return keys.map(key => ({key, ...COLUMNS[key]}));
}

/** `round(clicks / emailCount * 100)`, matching Ember's `clickRate`. */
export function getPostClickRate(post: PostListItem): number {
    const sent = post.email?.email_count;
    const clicks = post.count?.clicks;

    if (!sent || !clicks) {
        return 0;
    }

    return Math.round((clicks / sent) * 100);
}

/** Ember stores this as an already-computed percentage on the email. */
export function getPostOpenRate(post: PostListItem): number {
    const sent = post.email?.email_count;
    const opened = post.email?.opened_count;

    if (!sent || !opened) {
        return 0;
    }

    return Math.round((opened / sent) * 100);
}
