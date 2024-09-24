import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {Button, NoValueLabel} from '@tryghost/admin-x-design-system';

import APAvatar, {AvatarBadge} from './global/APAvatar';
import ActivityItem, {type Activity} from './activities/ActivityItem';
import ArticleModal from './feed/ArticleModal';
import MainNavigation from './navigation/MainNavigation';

import getUsername from '../utils/get-username';
import {useAllActivitiesForUser, useSiteUrl} from '../hooks/useActivityPubQueries';
import {useFollowersForUser} from '../MainContent';

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
        if (activity.object) {
            return `Liked your article "${activity.object.name}"`;
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
    const siteUrl = useSiteUrl();

    const {data: activities = []} = useAllActivitiesForUser({
        handle: user,
        includeOwn: true,
        includeReplies: true,
        filter: {
            type: ['Follow', 'Like', `Create:Note:isReplyToOwn,${new URL(siteUrl).hostname}`]
        }
    });

    // Retrieve followers for the user
    const {data: followers = []} = useFollowersForUser(user);

    const isFollower = (id: string): boolean => {
        return followers.includes(id);
    };

    return (
        <>
            <MainNavigation title='Activities' />
            <div className='z-0 flex w-full flex-col items-center'>
                {activities.length === 0 && (
                    <div className='mt-8'>
                        <NoValueLabel icon='bell'>
                            When other Fediverse users interact with you, you&apos;ll see it here.
                        </NoValueLabel>
                    </div>
                )}
                {activities.length > 0 && (
                    <div className='mt-8 flex w-full max-w-[560px] flex-col'>
                        {activities?.map(activity => (
                            <ActivityItem
                                key={activity.id}
                                url={getActivityUrl(activity) || getActorUrl(activity)}
                                onClick={
                                    activity.type === ACTVITY_TYPE.CREATE ? () => {
                                        NiceModal.show(ArticleModal, {
                                            object: activity.object,
                                            actor: activity.actor,
                                            comments: activity.object.replies
                                        });
                                    } : undefined
                                }
                            >
                                <APAvatar author={activity.actor} badge={getActivityBadge(activity)} />
                                <div className='pt-[2px]'>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{activity.actor.name}</span>
                                        {getUsername(activity.actor)}
                                    </div>
                                    <div className=''>{getActivityDescription(activity)}</div>
                                    {getExtendedDescription(activity)}
                                </div>
                                {isFollower(activity.actor.id) === false && (
                                    <Button className='ml-auto' label='Follow' link onClick={(e) => {
                                        e?.preventDefault();

                                        alert('Implement me!');
                                    }} />
                                )}
                            </ActivityItem>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default Activities;
