import GlobalFeedList from './components/GlobalFeedList';
import React from 'react';
import {default as GlobalError} from '@components/layout/Error';
import {isApiError} from '@src/api/activitypub';
import {useGlobalFeedForUser} from '@hooks/use-activity-pub-queries';

const GlobalFeed: React.FC = () => {
    const {globalFeedQuery} = useGlobalFeedForUser({enabled: true});
    const feedQueryData = globalFeedQuery;
    const {data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    if (error && isApiError(error)) {
        return <GlobalError errorCode={error.code} statusCode={error.statusCode}/>;
    }

    return <GlobalFeedList
        activities={activities}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
    />;
};

export default GlobalFeed;
