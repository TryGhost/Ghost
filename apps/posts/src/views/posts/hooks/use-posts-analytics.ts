import {useEffect, useRef, useState} from 'react';
import {usePostsMemberCounts, usePostsVisitorCounts} from '@tryghost/admin-x-framework/api/stats';
import type {Post} from '@tryghost/admin-x-framework/api/posts';

export interface PostMemberCounts {
    free: number;
    paid: number;
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
    const {mutateAsync: fetchVisitorCounts} = usePostsVisitorCounts();
    const {mutateAsync: fetchMemberCounts} = usePostsMemberCounts();
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

        fetchVisitorCounts({postUuids})
            .then((result) => {
                const counts = result.stats?.[0]?.data?.visitor_counts ?? {};
                setVisitorCounts(current => ({...current, ...counts}));
            })
            .catch(() => {
                // Silent failure — visitor counts are not critical
            });
    }, [posts, visitorCountsEnabled, fetchVisitorCounts]);

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

        fetchMemberCounts({postIds})
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
    }, [posts, memberCountsEnabled, fetchMemberCounts]);

    return {visitorCounts, memberCounts};
}
