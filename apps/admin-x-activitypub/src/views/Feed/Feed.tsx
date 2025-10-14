import Error from '@components/layout/Error';
import FeedList from './components/FeedList';
import NotesStoreDebug from '@src/components/dev/NotesStoreDebug';
import React from 'react';
import {isApiError} from '@src/api/activitypub';
import {useActivitiesForList} from '@src/stores/notesStore';
import {
    useFeedForUser,
    useUserDataForUser
} from '@hooks/use-activity-pub-queries';

const Feed: React.FC = () => {
    const {feedQuery} = useFeedForUser({enabled: true});
    const {error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQuery;

    const storeActivities = useActivitiesForList('feed');
    const activities = (storeActivities.length > 0
        ? storeActivities
        : (isLoading ? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})) : []));

    const {data: user} = useUserDataForUser('index');

    if (error && isApiError(error)) {
        return <Error errorCode={error.code} statusCode={error.statusCode}/>;
    }

    return <>
        <FeedList
            activities={activities}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage!}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            user={user!}
        />
        <NotesStoreDebug onlyInDev={false} />
    </>;
};

export default Feed;
