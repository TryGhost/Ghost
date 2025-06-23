import FeedList from './components/FeedList';
import React from 'react';
import {
    useFeedForUser,
    useUserDataForUser
} from '@hooks/use-activity-pub-queries';

const Feed: React.FC = () => {
    const {feedQuery} = useFeedForUser({enabled: true});

    const feedQueryData = feedQuery;
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    const {data: user} = useUserDataForUser('index');

    return <FeedList
        activities={activities}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage!}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        user={user!}
    />;
};

export default Feed;
