import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useFramework} from '@tryghost/admin-x-framework';
import type {Post} from '@tryghost/admin-x-framework/api/posts';

export interface PostMemberCounts {
    free: number;
    paid: number;
}

interface VisitorCountsResponse {
    stats?: Array<{data?: {visitor_counts?: Record<string, number>}}>;
}

interface MemberCountsResponse {
    stats?: Array<Record<string, {free_members?: number; paid_members?: number}>>;
}

/**
 * Minimal POST helper for the stats endpoints. The framework's internal
 * fetch utility isn't exported, so this mirrors its essential behavior
 * (admin API root, credentials, version header).
 */
function useStatsPost() {
    const {ghostVersion} = useFramework();

    return useCallback(async <ResponseData,>(path: string, body: unknown): Promise<ResponseData> => {
        const {apiRoot} = getGhostPaths();
        const response = await fetch(`${apiRoot}${path}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'app-pragma': 'no-cache',
                'content-type': 'application/json',
                ...(ghostVersion ? {'x-ghost-version': ghostVersion} : {})
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Stats request failed: ${response.status}`);
        }

        return await response.json() as ResponseData;
    }, [ghostVersion]);
}

/**
 * Batch-loads visitor counts (by post uuid) and member conversion counts
 * (by post id) for the published posts currently in the list. Counts are
 * fetched once per post as new pages load (Ember parity: post-analytics
 * service). Failures are silent — analytics are not critical.
 */
export function usePostsAnalytics({posts, visitorCountsEnabled, memberCountsEnabled}: {
    posts: Post[];
    visitorCountsEnabled: boolean;
    memberCountsEnabled: boolean;
}) {
    const statsPost = useStatsPost();
    const [visitorCounts, setVisitorCounts] = useState<Record<string, number>>({});
    const [memberCounts, setMemberCounts] = useState<Record<string, PostMemberCounts>>({});
    const fetchedUuids = useRef(new Set<string>());
    const fetchedIds = useRef(new Set<string>());

    useEffect(() => {
        if (!visitorCountsEnabled) {
            return;
        }

        const postUuids = posts
            .filter(post => post.status === 'published' && post.uuid && !fetchedUuids.current.has(post.uuid))
            .map(post => post.uuid);

        if (postUuids.length === 0) {
            return;
        }

        postUuids.forEach(uuid => fetchedUuids.current.add(uuid));

        statsPost<VisitorCountsResponse>('/stats/posts-visitor-counts/', {postUuids})
            .then((result) => {
                const counts = result.stats?.[0]?.data?.visitor_counts ?? {};
                setVisitorCounts(current => ({...current, ...counts}));
            })
            .catch(() => {
                // Silent failure — visitor counts are not critical
            });
    }, [posts, visitorCountsEnabled, statsPost]);

    useEffect(() => {
        if (!memberCountsEnabled) {
            return;
        }

        const postIds = posts
            .filter(post => post.status === 'published' && !fetchedIds.current.has(post.id))
            .map(post => post.id);

        if (postIds.length === 0) {
            return;
        }

        postIds.forEach(id => fetchedIds.current.add(id));

        statsPost<MemberCountsResponse>('/stats/posts-member-counts/', {postIds})
            .then((result) => {
                const countsById = result.stats?.[0] ?? {};
                const next: Record<string, PostMemberCounts> = {};
                for (const [id, counts] of Object.entries(countsById)) {
                    next[id] = {
                        free: counts.free_members ?? 0,
                        paid: counts.paid_members ?? 0
                    };
                }
                setMemberCounts(current => ({...current, ...next}));
            })
            .catch(() => {
                // Silent failure — member counts are not critical
            });
    }, [posts, memberCountsEnabled, statsPost]);

    return {visitorCounts, memberCounts};
}
