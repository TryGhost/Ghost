import Error from '@components/layout/Error';
import FeedList from './components/FeedList';
import React from 'react';
import {isApiError} from '@src/api/activitypub';
import {
    useFeedForUser,
    useUserDataForUser
} from '@hooks/use-activity-pub-queries';

const Feed: React.FC = () => {
    const {feedQuery} = useFeedForUser({enabled: true});
    const {data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQuery;

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    const {data: user} = useUserDataForUser('index');

    if (error && isApiError(error)) {
        return <Error statusCode={error.statusCode}/>;
    }

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
