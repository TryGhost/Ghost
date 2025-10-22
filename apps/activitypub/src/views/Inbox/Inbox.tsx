import Error from '@components/layout/Error';
import InboxList from './components/InboxList';
import React from 'react';
import {isApiError} from '@src/api/activitypub';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useFeedMode} from '@src/hooks/use-feed-mode';
import {useGlobalFeedForUser, useInboxForUser} from '@hooks/use-activity-pub-queries';

const Inbox: React.FC = () => {
    const {isEnabled} = useFeatureFlags();
    const {feedMode} = useFeedMode(isEnabled('global-feed'));

    const {inboxQuery: followingQuery} = useInboxForUser({enabled: feedMode === 'following'});
    const {globalFeedQuery: discoverQuery} = useGlobalFeedForUser({enabled: feedMode === 'discover'});

    const feedQueryData = feedMode === 'discover' ? discoverQuery : followingQuery;
    const {data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    if (error && isApiError(error)) {
        return <Error errorCode={error.code} statusCode={error.statusCode}/>;
    }

    return <InboxList
        activities={activities}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage!}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
    />;
};

export default Inbox;
