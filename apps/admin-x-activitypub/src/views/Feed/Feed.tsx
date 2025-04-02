import FeedList from './components/FeedList';
import React, {useEffect, useRef} from 'react';
import {
    useFeedForUser,
    useUserDataForUser
} from '@hooks/use-activity-pub-queries';

const Feed: React.FC = () => {
    const {feedQuery} = useFeedForUser({enabled: true});

    const feedQueryData = feedQuery;
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

    const {data: user} = useUserDataForUser('index');

    // Calculate the index at which to place the loadMoreRef - This will place it ~75% through the list
    const loadMoreIndex = Math.max(0, Math.floor(activities.length * 0.75) - 1);

    return <FeedList
        activities={activities}
        endLoadMoreRef={endLoadMoreRef}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        loadMoreIndex={loadMoreIndex}
        loadMoreRef={loadMoreRef}
        user={user!}
    />;
};

export default Feed;
