import React, {useEffect, useRef} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import {Activity, ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LoadingIndicator, NoValueLabel} from '@tryghost/admin-x-design-system';

import APAvatar from './global/APAvatar';
import ArticleModal from './feed/ArticleModal';
import MainNavigation from './navigation/MainNavigation';
import NotificationItem from './activities/NotificationItem';
import Separator from './global/Separator';

import getUsername from '../utils/get-username';
import stripHtml from '../utils/strip-html';
import truncate from '../utils/truncate';
import {GET_ACTIVITIES_QUERY_KEY_NOTIFICATIONS, useActivitiesForUser} from '../hooks/useActivityPubQueries';
import {type NotificationType} from './activities/NotificationIcon';
import {handleProfileClick} from '../utils/handle-profile-click';

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
                dangerouslySetInnerHTML={{__html: stripHtml(activity.object?.content || '')}}
                className='ap-note-content mt-1 line-clamp-2 text-pretty text-grey-700'
            />
        );
    } else if (activity.type === ACTIVITY_TYPE.LIKE && !activity.object?.name && activity.object?.content) {
        return (
            <div
                dangerouslySetInnerHTML={{__html: stripHtml(activity.object?.content || '')}}
                className='ap-note-content mt-1 line-clamp-2 text-pretty text-grey-700'
            ></div>
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
    const [firstActor, secondActor, ...otherActors] = group.actors;
    const hasOthers = otherActors.length > 0;

    const actorClass = 'cursor-pointer font-semibold hover:underline';

    const actorText = (
        <>
            <span
                className={actorClass}
                onClick={e => handleProfileClick(firstActor, e)}
            >{firstActor.name}</span>
            {secondActor && (
                <>
                    {hasOthers ? ', ' : ' and '}
                    <span
                        className={actorClass}
                        onClick={e => handleProfileClick(secondActor, e)}
                    >{secondActor.name}</span>
                </>
            )}
            {hasOthers && ' and others'}
        </>
    );

    switch (group.type) {
    case ACTIVITY_TYPE.FOLLOW:
        return <>{actorText} started following you</>;
    case ACTIVITY_TYPE.LIKE:
        return <>{actorText} liked your post <span className='font-semibold'>{group.object?.name || ''}</span></>;
    case ACTIVITY_TYPE.CREATE:
        if (group.object?.inReplyTo && typeof group.object?.inReplyTo !== 'string') {
            const content = stripHtml(group.object.inReplyTo.name);
            return <>{actorText} replied to your post <span className='font-semibold'>{truncate(content, 80)}</span></>;
        }
    }
    return <></>;
};

const Activities: React.FC<ActivitiesProps> = ({}) => {
    const user = 'index';
    const [openStates, setOpenStates] = React.useState<{[key: string]: boolean}>({});

    const toggleOpen = (groupId: string) => {
        setOpenStates(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const maxAvatars = 5;

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
    const groupedActivities = (data?.pages.flatMap((page) => {
        const filtered = page.data.filter((activity, index, self) => index === self.findIndex(a => a.id === activity.id));

        return groupActivities(filtered);
    }) ?? []);

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

    const handleActivityClick = (group: GroupedActivity, index: number) => {
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
                width: group.object?.type === 'Article' ? 'wide' : 'narrow'
            });
            break;
        case ACTIVITY_TYPE.FOLLOW:
            if (group.actors.length > 1) {
                toggleOpen(group.id || `${group.type}_${index}`);
            } else {
                handleProfileClick(group.actors[0]);
            }
            break;
        }
    };
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
                    isLoading === false && groupedActivities.length === 0 && (
                        <div className='mt-8'>
                            <NoValueLabel icon='bell'>
                                When other Fediverse users interact with you, you&apos;ll see it here.
                            </NoValueLabel>
                        </div>
                    )
                }
                {
                    (isLoading === false && groupedActivities.length > 0) && (
                        <>
                            <div className='my-8 flex w-full max-w-[560px] flex-col'>
                                {groupedActivities.map((group, index) => (
                                    <React.Fragment key={group.id || `${group.type}_${index}`}>
                                        <NotificationItem
                                            className='hover:bg-gray-100'
                                            onClick={() => handleActivityClick(group, index)}
                                        >
                                            <NotificationItem.Icon type={getActivityBadge(group)} />
                                            <NotificationItem.Avatars>
                                                <div className='flex flex-col'>
                                                    <div className='mt-0.5 flex items-center gap-1.5'>
                                                        {!openStates[group.id || `${group.type}_${index}`] && group.actors.slice(0, maxAvatars).map(actor => (
                                                            <APAvatar
                                                                key={actor.id}
                                                                author={actor}
                                                                size='notification'
                                                            />
                                                        ))}
                                                        {group.actors.length > maxAvatars && (!openStates[group.id || `${group.type}_${index}`]) && (
                                                            <div
                                                                className='flex h-9 w-5 items-center justify-center text-sm text-grey-700'
                                                            >
                                                                {`+${group.actors.length - maxAvatars}`}
                                                            </div>
                                                        )}

                                                        {group.actors.length > 1 && (
                                                            <Button
                                                                className={`transition-color flex h-9 items-center rounded-full bg-transparent text-grey-700 hover:opacity-60 ${openStates[group.id || `${group.type}_${index}`] ? 'w-full justify-start pl-1' : '-ml-2 w-9 justify-center'}`}
                                                                hideLabel={!openStates[group.id || `${group.type}_${index}`]}
                                                                icon='chevron-down'
                                                                iconColorClass={`w-[12px] h-[12px] ${openStates[group.id || `${group.type}_${index}`] ? 'rotate-180' : ''}`}
                                                                label={`${openStates[group.id || `${group.type}_${index}`] ? 'Hide' : 'Show all'}`}
                                                                unstyled
                                                                onClick={(event) => {
                                                                    event?.stopPropagation();
                                                                    toggleOpen(group.id || `${group.type}_${index}`);
                                                                }}/>
                                                        )}
                                                    </div>
                                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out  ${openStates[group.id || `${group.type}_${index}`] ? 'mb-2 max-h-[1384px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                        {openStates[group.id || `${group.type}_${index}`] && group.actors.length > 1 && (
                                                            <div className='flex flex-col gap-2 pt-4'>
                                                                {group.actors.map(actor => (
                                                                    <div
                                                                        key={actor.id}
                                                                        className='flex items-center hover:opacity-80'
                                                                        onClick={e => handleProfileClick(actor, e)}
                                                                    >
                                                                        <APAvatar author={actor} size='xs' />
                                                                        <span className='ml-2 text-base font-semibold'>{actor.name}</span>
                                                                        <span className='ml-1 text-base text-grey-700'>{getUsername(actor)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </NotificationItem.Avatars>
                                            <NotificationItem.Content>
                                                <div className='line-clamp-2 text-pretty text-black'>
                                                    {getGroupDescription(group)}
                                                </div>
                                                {getExtendedDescription(group)}
                                            </NotificationItem.Content>
                                        </NotificationItem>
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
