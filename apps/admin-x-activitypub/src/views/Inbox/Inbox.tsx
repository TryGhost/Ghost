import InboxList from './component/InboxList';
import React, {useEffect, useRef} from 'react';
import {useInboxForUser} from '@hooks/use-activity-pub-queries';

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

    return <InboxList
        activities={activities}
        endLoadMoreRef={endLoadMoreRef}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        loadMoreIndex={loadMoreIndex}
        loadMoreRef={loadMoreRef}
    />;
};

export default Inbox;
