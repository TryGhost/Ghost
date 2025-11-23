import Error from '@components/layout/Error';
import InboxList from './components/InboxList';
import React, {useState} from 'react';
import {Topic} from '@src/components/TopicFilter';
import {isApiError} from '@src/api/activitypub';
import {useDiscoveryFeedForUser, useInboxForUser} from '@hooks/use-activity-pub-queries';

const Inbox: React.FC = () => {
    const [topic, setTopic] = useState<Topic>('following');

    const {inboxQuery: followingQuery} = useInboxForUser({enabled: topic === 'following'});
    const {discoveryFeedQuery: discoverQuery} = useDiscoveryFeedForUser({enabled: topic !== 'following', topic});

    const feedQueryData = topic === 'following' ? followingQuery : discoverQuery;
    const {data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = feedQueryData;

    const topicNotFound = error && isApiError(error) && error.statusCode === 404 && topic !== 'following';

    if (error && isApiError(error) && !topicNotFound) {
        return <Error errorCode={error.code} statusCode={error.statusCode}/>;
    }

    const activities = topicNotFound ? [] : (data?.pages.flatMap(page => page.posts) ?? Array.from({length: 5}, (_, index) => ({id: `placeholder-${index}`, object: {}})));

    return <InboxList
        activities={activities}
        currentTopic={topic}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage!}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        onTopicChange={setTopic}
    />;
};

export default Inbox;
