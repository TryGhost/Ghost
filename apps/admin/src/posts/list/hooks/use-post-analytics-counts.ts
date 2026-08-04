import {usePostMemberCounts, usePostVisitorCounts} from '@tryghost/admin-x-framework/api/stats';
import {useMemo} from 'react';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';

/**
 * Visitor and member counts for the rows currently on screen.
 *
 * Batched into one request each, and only for published posts — the columns
 * they feed are hidden otherwise. Both are gated on the matching site setting,
 * so a site without web analytics never asks for visitor counts.
 *
 * Deliberately not blocking: the list renders with zeroes and the numbers fill
 * in, as they do in Ember, where the loads are explicitly not awaited so a slow
 * analytics service can't hold up the screen.
 */
export interface UsePostAnalyticsCountsOptions {
    items: PostListItem[];
    webAnalyticsEnabled: boolean;
    membersTrackSources: boolean;
}

export function usePostAnalyticsCounts({
    items, webAnalyticsEnabled, membersTrackSources
}: UsePostAnalyticsCountsOptions) {
    const published = useMemo(
        () => items.filter(item => item.status === 'published'),
        [items]
    );

    const postUuids = useMemo(
        () => published.map(item => item.uuid).filter((uuid): uuid is string => Boolean(uuid)),
        [published]
    );

    const postIds = useMemo(() => published.map(item => item.id), [published]);

    const {data: visitorCounts} = usePostVisitorCounts(postUuids, {enabled: webAnalyticsEnabled});
    const {data: memberCounts} = usePostMemberCounts(postIds, {enabled: membersTrackSources});

    return {visitorCounts, memberCounts};
}
