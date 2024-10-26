import React, {useEffect, useRef} from 'react';

import NiceModal from '@ebay/nice-modal-react';
import {LoadingIndicator, NoValueLabel} from '@tryghost/admin-x-design-system';

import APAvatar, {AvatarBadge} from './global/APAvatar';
import ActivityItem, {type Activity} from './activities/ActivityItem';
import ArticleModal from './feed/ArticleModal';
// import FollowButton from './global/FollowButton';
import MainNavigation from './navigation/MainNavigation';
import ViewProfileModal from './global/ViewProfileModal';

import getUsername from '../utils/get-username';
import {useActivitiesForUser} from '../hooks/useActivityPubQueries';
// import {useFollowersForUser} from '../MainContent';

interface ActivitiesProps {}

// eslint-disable-next-line no-shadow
enum ACTVITY_TYPE {
    CREATE = 'Create',
    LIKE = 'Like',
    FOLLOW = 'Follow'
}

const getActivityDescription = (activity: Activity): string => {
    switch (activity.type) {
    case ACTVITY_TYPE.CREATE:
        if (activity.object?.inReplyTo && typeof activity.object?.inReplyTo !== 'string') {
            return `Commented on your article "${activity.object.inReplyTo.name}"`;
        }

        return '';
    case ACTVITY_TYPE.FOLLOW:
        return 'Followed you';
    case ACTVITY_TYPE.LIKE:
        if (activity.object && activity.object.type === 'Article') {
            return `Liked your article "${activity.object.name}"`;
        } else if (activity.object && activity.object.type === 'Note') {
            return `${activity.object.content}`;
        }
    }

    return '';
};

const getExtendedDescription = (activity: Activity): JSX.Element | null => {
    // If the activity is a reply
    if (Boolean(activity.type === ACTVITY_TYPE.CREATE && activity.object?.inReplyTo)) {
        return (
            <div
                dangerouslySetInnerHTML={{__html: activity.object?.content || ''}}
                className='mt-2'
            />
        );
    }

    return null;
};

const getActivityUrl = (activity: Activity): string | null => {
    if (activity.object) {
        return activity.object.url || null;
    }

    return null;
};

const getActorUrl = (activity: Activity): string | null => {
    if (activity.actor) {
        return activity.actor.url;
    }

    return null;
};

const getActivityBadge = (activity: Activity): AvatarBadge => {
    switch (activity.type) {
    case ACTVITY_TYPE.CREATE:
        return 'comment-fill';
    case ACTVITY_TYPE.FOLLOW:
        return 'user-fill';
    case ACTVITY_TYPE.LIKE:
        if (activity.object) {
            return 'heart-fill';
        }
    }
};

const Activities: React.FC<ActivitiesProps> = ({}) => {
    const user = 'index';

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useActivitiesForUser({
        handle: user,
        includeOwn: true,
        includeReplies: true,
        filter: {
            type: ['Follow', 'Like', `Create:Note:isReplyToOwn`]
        }
    });

    const activities = (data?.pages.flatMap(page => page.data) ?? []);

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

    // Retrieve followers for the user
    // const {data: followers = []} = useFollowersForUser(user);

    // const isFollower = (id: string): boolean => {
    //     return followers.includes(id);
    // };

    const handleActivityClick = (activity: Activity) => {
        switch (activity.type) {
        case ACTVITY_TYPE.CREATE:
            NiceModal.show(ArticleModal, {
                object: activity.object,
                actor: activity.actor,
                comments: activity.object.replies
            });
            break;
        case ACTVITY_TYPE.LIKE:
            NiceModal.show(ArticleModal, {
                object: activity.object,
                actor: activity.actor,
                comments: activity.object.replies
            });
            break;
        case ACTVITY_TYPE.FOLLOW:
            NiceModal.show(ViewProfileModal, {
                profile: getUsername(activity.actor),
                onFollow: () => {},
                onUnfollow: () => {}
            });
            break;
        default:
        }
    };

    return (
        <>
            <MainNavigation title='Activities' />
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
                                {activities?.map(activity => (
                                    <ActivityItem
                                        key={activity.id}
                                        url={getActivityUrl(activity) || getActorUrl(activity)}
                                        onClick={() => handleActivityClick(activity)}
                                    >
                                        <APAvatar author={activity.actor} badge={getActivityBadge(activity)} />
                                        <div className='min-w-0'>
                                            <div className='truncate text-grey-600'>
                                                <span className='mr-1 font-bold text-black'>{activity.actor.name}</span>
                                                {getUsername(activity.actor)}
                                            </div>
                                            <div className=''>{getActivityDescription(activity)}</div>
                                            {getExtendedDescription(activity)}
                                        </div>
                                        {/* <FollowButton
                                            className='ml-auto'
                                            following={isFollower(activity.actor.id)}
                                            handle={getUsername(activity.actor)}
                                            type='link'
                                        /> */}
                                    </ActivityItem>
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
