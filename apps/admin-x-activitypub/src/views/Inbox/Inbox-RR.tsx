import InboxList from './component/InboxList';
import React, {useEffect, useRef} from 'react';
import {Navigate} from '@tryghost/admin-x-framework';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useInboxForUser} from '@hooks/use-activity-pub-queries';

/**
 * TODO: Before merge:
 * 1. Remove Inbox and rename this to `Inbox`
 * 2. Update routes to use this component
 * 3. Update routes to use `inbox` instead of `inbox-rr`
 */

const Inbox: React.FC = () => {
    const {inboxQuery} = useInboxForUser({enabled: true});
    const feedQueryData = inboxQuery;
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const endLoadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        if (endLoadMoreRef.current) {
            observerRef.current.observe(endLoadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Calculate the index at which to place the loadMoreRef - This will place it ~75% through the list
    const loadMoreIndex = Math.max(0, Math.floor(activities.length * 0.75) - 1);

    const {isEnabled} = useFeatureFlags();
    if (!isEnabled('ap-routes')) {
        return <Navigate to='/inbox' />;
    }

    return <InboxList
        activities={activities}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        loadMoreIndex={loadMoreIndex}
        loadMoreRef={loadMoreRef}
    />;
};

export default Inbox;
