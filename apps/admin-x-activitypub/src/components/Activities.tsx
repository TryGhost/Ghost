import React, {useEffect, useRef} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import {Activity, ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {LoadingIndicator, NoValueLabel, Popover} from '@tryghost/admin-x-design-system';

import APAvatar from './global/APAvatar';
import ArticleModal from './feed/ArticleModal';
import MainNavigation from './navigation/MainNavigation';
import NotificationItem from './activities/NotificationItem';
import Separator from './global/Separator';
import ViewProfileModal from './modals/ViewProfileModal';

import getUsername from '../utils/get-username';
import stripHtml from '../utils/strip-html';
import truncate from '../utils/truncate';
import {GET_ACTIVITIES_QUERY_KEY_NOTIFICATIONS, useActivitiesForUser} from '../hooks/useActivityPubQueries';
import {type NotificationType} from './activities/NotificationIcon';

interface ActivitiesProps {}

// eslint-disable-next-line no-shadow
enum ACTIVITY_TYPE {
    CREATE = 'Create',
    LIKE = 'Like',
    FOLLOW = 'Follow'
}

interface GroupedActivity {
    type: ACTIVITY_TYPE;
    actors: ActorProperties[];
    object: ObjectProperties;
    id?: string;
}

const getExtendedDescription = (activity: GroupedActivity): JSX.Element | null => {
    // If the activity is a reply
    if (Boolean(activity.type === ACTIVITY_TYPE.CREATE && activity.object?.inReplyTo)) {
        return (
            <div
                dangerouslySetInnerHTML={{__html: activity.object?.content || ''}}
                className='mt-1 line-clamp-2 text-pretty text-grey-700'
            />
        );
    }

    return null;
};

const getActivityBadge = (activity: GroupedActivity): NotificationType => {
    switch (activity.type) {
    case ACTIVITY_TYPE.CREATE:
        return 'reply';
    case ACTIVITY_TYPE.FOLLOW:
        return 'follow';
    case ACTIVITY_TYPE.LIKE:
        if (activity.object) {
            return 'like';
        }
    }

    return 'like';
};

const groupActivities = (activities: Activity[]): GroupedActivity[] => {
    const groups: {[key: string]: GroupedActivity} = {};

    // Activities are already sorted by time from the API
    activities.forEach((activity) => {
        let groupKey = '';

        switch (activity.type) {
        case ACTIVITY_TYPE.FOLLOW:
            // Group follows that are next to each other in the array
            groupKey = `follow_${activity.type}`;
            break;
        case ACTIVITY_TYPE.LIKE:
            if (activity.object?.id) {
                // Group likes by the target object
                groupKey = `like_${activity.object.id}`;
            }
            break;
        case ACTIVITY_TYPE.CREATE:
            // Don't group creates/replies
            groupKey = `create_${activity.id}`;
            break;
        }

        if (!groups[groupKey]) {
            groups[groupKey] = {
                type: activity.type as ACTIVITY_TYPE,
                actors: [],
                object: activity.object,
                id: activity.id
            };
        }

        // Add actor if not already in the group
        if (!groups[groupKey].actors.find(a => a.id === activity.actor.id)) {
            groups[groupKey].actors.push(activity.actor);
        }
    });

    // Return in same order as original activities
    return Object.values(groups);
};

const getGroupDescription = (group: GroupedActivity): JSX.Element => {
    const actorNames = group.actors.map(actor => actor.name);
    const [firstActor, secondActor, ...otherActors] = actorNames;
    const hasOthers = otherActors.length > 0;

    switch (group.type) {
    case ACTIVITY_TYPE.FOLLOW:
        if (!secondActor) {
            return (
                <>
                    <span className="font-semibold">{firstActor}</span> started following you
                </>
            );
        }
        if (!hasOthers) {
            return (
                <>
                    <span className="font-semibold">{firstActor}</span> and{' '}
                    <span className="font-semibold">{secondActor}</span> started following you
                </>
            );
        }
        return (
            <>
                <span className="font-semibold">{firstActor}</span>,{' '}
                <span className="font-semibold">{secondActor}</span>
                {hasOthers ? ' and others' : ''} started following you
            </>
        );
    case ACTIVITY_TYPE.LIKE:
        const articleName = group.object?.name || truncate(stripHtml(group.object?.content || ''), 200) || 'a post';
        if (!secondActor) {
            return (
                <>
                    <span className="font-semibold">{firstActor}</span> liked your post{' '}
                    <span className="font-semibold">{articleName}</span>
                </>
            );
        }
        if (!hasOthers) {
            return (
                <>
                    <span className="font-semibold">{firstActor}</span> and{' '}
                    <span className="font-semibold">{secondActor}</span> liked your post{' '}
                    <span className="font-semibold">{articleName}</span>
                </>
            );
        }
        return (
            <>
                <span className="font-semibold">{firstActor}</span>,{' '}
                <span className="font-semibold">{secondActor}</span>
                {hasOthers ? ' and others' : ''} liked your post{' '}
                <span className="font-semibold">{articleName}</span>
            </>
        );
    case ACTIVITY_TYPE.CREATE:
        if (group.object?.inReplyTo && typeof group.object?.inReplyTo !== 'string') {
            const content = stripHtml(group.object.inReplyTo.content);
            return <>{group.actors[0].name} replied to your post <span className='font-semibold'>{truncate(content)}</span></>;
        }
    }
    return <></>;
};

const Activities: React.FC<ActivitiesProps> = ({}) => {
    const user = 'index';

    const {getActivitiesQuery} = useActivitiesForUser({
        handle: user,
        includeOwn: true,
        includeReplies: true,
        filter: {
            type: ['Follow', 'Like', `Create:Note:isReplyToOwn`]
        },
        key: GET_ACTIVITIES_QUERY_KEY_NOTIFICATIONS
    });
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = getActivitiesQuery;
    const activities = (data?.pages.flatMap(page => page.data) ?? [])
        // If there somehow are duplicate activities, filter them out so the list rendering doesn't break
        .filter((activity, index, self) => index === self.findIndex(a => a.id === activity.id));

    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleActivityClick = (group: GroupedActivity) => {
        switch (group.type) {
        case ACTIVITY_TYPE.CREATE:
            NiceModal.show(ArticleModal, {
                activityId: group.id,
                object: group.object,
                actor: group.actors[0],
                focusReplies: true,
                width: typeof group.object?.inReplyTo === 'object' && group.object?.inReplyTo?.type === 'Article' ? 'wide' : 'narrow'
            });
            break;
        case ACTIVITY_TYPE.LIKE:
            NiceModal.show(ArticleModal, {
                activityId: group.id,
                object: group.object,
                actor: group.object.attributedTo as ActorProperties,
                width: 'wide'
            });
            break;
        case ACTIVITY_TYPE.FOLLOW:
            NiceModal.show(ViewProfileModal, {
                profile: getUsername(group.actors[0])
            });
            break;
        }
    };

    const groupedActivities = groupActivities(activities);

    return (
        <>
            <MainNavigation page='activities'/>
            <div className='z-0 flex w-full flex-col items-center'>
                {
                    isLoading && (<div className='mt-8 flex flex-col items-center justify-center space-y-4 text-center'>
                        <LoadingIndicator size='lg' />
                    </div>)
                }
                {
                    isLoading === false && activities.length === 0 && (
                        <div className='mt-8'>
                            <NoValueLabel icon='bell'>
                                When other Fediverse users interact with you, you&apos;ll see it here.
                            </NoValueLabel>
                        </div>
                    )
                }
                {
                    (isLoading === false && activities.length > 0) && (
                        <>
                            <div className='mt-8 flex w-full max-w-[560px] flex-col'>
                                {groupedActivities.map((group, index) => (
                                    <React.Fragment key={group.id || `${group.type}_${index}`}>
                                        <div className=''>

                                            <NotificationItem
                                                className="hover:bg-gray-100"
                                                onClick={() => handleActivityClick(group)}
                                            >
                                                <NotificationItem.Icon type={getActivityBadge(group)} />
                                                <NotificationItem.Avatars>
                                                    {group.actors.slice(0, 3).map(actor => (
                                                        <APAvatar
                                                            key={actor.id}
                                                            author={actor}
                                                            size="sm"
                                                        />
                                                    ))}
                                                    {group.actors.length > 3 && (
                                                        <Popover
                                                            trigger={
                                                                <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-grey-100 text-sm text-grey-700 hover:bg-grey-200">
                                                                    +{group.actors.length - 3}
                                                                </div>
                                                            }
                                                        >
                                                            <div className="flex max-h-[300px] min-w-[200px] flex-col gap-2 overflow-y-auto p-4">
                                                                {group.actors.slice(3).map(actor => (
                                                                    <div key={actor.id} className="flex items-center gap-2">
                                                                        <APAvatar author={actor} size="xs" />
                                                                        <span className="text-base font-semibold">{actor.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </Popover>
                                                    )}
                                                </NotificationItem.Avatars>
                                                <NotificationItem.Content>
                                                    <div className="line-clamp-2 text-pretty text-black">
                                                        {getGroupDescription(group)}
                                                    </div>
                                                    {group.type === ACTIVITY_TYPE.CREATE &&
                                                        getExtendedDescription(group)}
                                                </NotificationItem.Content>
                                            </NotificationItem>

                                        </div>
                                        {index < groupedActivities.length - 1 && <Separator />}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div ref={loadMoreRef} className='h-1'></div>
                            {isFetchingNextPage && (
                                <div className='flex flex-col items-center justify-center space-y-4 text-center'>
                                    <LoadingIndicator size='md' />
                                </div>
                            )}
                        </>
                    )
                }
            </div>
        </>
    );
};

export default Activities;
