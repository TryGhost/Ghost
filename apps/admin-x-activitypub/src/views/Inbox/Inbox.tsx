import InboxList from './components/InboxList';
import React from 'react';
import {useInboxForUser} from '@hooks/use-activity-pub-queries';

const Inbox: React.FC = () => {
    const {inboxQuery} = useInboxForUser({enabled: true});
    const feedQueryData = inboxQuery;
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

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
