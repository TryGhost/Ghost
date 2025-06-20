import InboxList from './components/InboxList';
import React from 'react';
import {useInboxForUser} from '@hooks/use-activity-pub-queries';
import {useSyncPostsWithStore} from '../../stores/sync-with-react-query';

const Inbox: React.FC = () => {
    const {inboxQuery} = useInboxForUser({enabled: true});
    const feedQueryData = inboxQuery;
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    // Valtio experiment: Sync React Query data with Valtio store
    useSyncPostsWithStore(undefined, data);

    const activities = (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    return <InboxList
        activities={activities}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage!}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
    />;
};

export default Inbox;
