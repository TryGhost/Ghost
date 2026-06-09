import {LucideIcon, abbreviateNumber, formatNumber} from '@tryghost/shade/utils';
import type {Email, Post} from '@tryghost/admin-x-framework/api/posts';
import type {PostMemberCounts} from '../hooks/use-posts-analytics';

export interface PostsListAnalyticsContext {
    webAnalyticsEnabled: boolean;
    membersTrackSources: boolean;
    emailTrackOpens: boolean;
    membersEnabled: boolean;
    /** Visitor counts keyed by post uuid */
    visitorCounts: Record<string, number>;
    /** Member conversion counts keyed by post id */
    memberCounts: Record<string, PostMemberCounts>;
}

function MetricLink({href, title, testAttribute, children}: {
    href: string;
    title: string;
    testAttribute: string;
    children: React.ReactNode;
}) {
    return (
        <a
            className="flex items-center gap-1 tabular-nums transition-colors hover:text-foreground"
            href={href}
            title={title}
            onClick={event => event.stopPropagation()}
            {...{[testAttribute]: true}}
        >
            {children}
        </a>
    );
}

/** The API returns track_opens on the email object, but the framework type omits it */
type EmailWithTracking = Email & {track_opens?: boolean};

function PostsListItemAnalytics({post, analytics}: {
    post: Post;
    analytics: PostsListAnalyticsContext;
}) {
    const isPublished = post.status === 'published';
    const email = post.email as EmailWithTracking | undefined;

    const showVisitors = analytics.webAnalyticsEnabled && isPublished;
    const showOpens = !!email && analytics.membersEnabled && analytics.emailTrackOpens && !!email.track_opens;
    const showSent = !!email && !showOpens;
    const showMemberConversions = analytics.membersTrackSources && isPublished;

    if (!showVisitors && !email && !showMemberConversions) {
        return null;
    }

    const visitorCount = analytics.visitorCounts[post.uuid] ?? 0;
    const conversionCounts = analytics.memberCounts[post.id];
    const memberConversions = (conversionCounts?.free ?? 0) + (conversionCounts?.paid ?? 0);
    const openRate = email && email.email_count > 0
        ? Math.round((email.opened_count / email.email_count) * 100)
        : 0;

    return (
        <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
            {showVisitors && (
                <MetricLink
                    href={`#/posts/analytics/${post.id}/web`}
                    testAttribute="data-test-analytics-visitors"
                    title="Unique visitors"
                >
                    <LucideIcon.Eye className="size-4" />
                    {abbreviateNumber(visitorCount)}
                </MetricLink>
            )}
            {showOpens && (
                <MetricLink
                    href={`#/posts/analytics/${post.id}/newsletter`}
                    testAttribute="data-test-analytics-opens"
                    title="Opens"
                >
                    <LucideIcon.MailOpen className="size-4" />
                    {openRate}%
                </MetricLink>
            )}
            {showSent && (
                <MetricLink
                    href={`#/posts/analytics/${post.id}/newsletter`}
                    testAttribute="data-test-analytics-sent"
                    title="Sent"
                >
                    <LucideIcon.Send className="size-4" />
                    {abbreviateNumber(email.email_count)}
                </MetricLink>
            )}
            {showMemberConversions && (
                <MetricLink
                    href={`#/posts/analytics/${post.id}/growth`}
                    testAttribute="data-test-analytics-member-conversions"
                    title="New members"
                >
                    <LucideIcon.UserPlus className="size-4" />
                    +{formatNumber(memberConversions)}
                </MetricLink>
            )}
        </div>
    );
}

export default PostsListItemAnalytics;
