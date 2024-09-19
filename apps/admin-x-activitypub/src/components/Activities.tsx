import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import {Button, NoValueLabel} from '@tryghost/admin-x-design-system';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';

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

const getActivityDescription = (activity: Activity, activityObjectsMap: Map<string, ObjectProperties>): string => {
    switch (activity.type) {
    case ACTVITY_TYPE.CREATE:
        const object = activityObjectsMap.get(activity.object?.inReplyTo || '');

        if (object?.name) {
            return `Commented on your article "${object.name}"`;
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

    let {data: activities = []} = useAllActivitiesForUser({handle: 'index', includeOwn: true});
    const siteUrl = useSiteUrl();

    // Create a map of activity objects from activities in the inbox and outbox.
    // This allows us to quickly look up an object associated with an activity
    // We could just make a http request to get the object, but this is more
    // efficient seeming though we already have the data in the inbox and outbox
    const activityObjectsMap = new Map<string, ObjectProperties>();

    activities.forEach((activity) => {
        if (activity.object) {
            activityObjectsMap.set(activity.object.id, activity.object);
        }
    });

    // Filter the activities to show
    activities = activities.filter((activity) => {
        if (activity.type === ACTVITY_TYPE.CREATE) {
            // Only show "Create" activities that are replies to a post created
            // by the user

            const replyToObject = activityObjectsMap.get(activity.object?.inReplyTo || '');

            // If the reply object is not found, or it doesn't have a URL or
            // name, do not show the activity
            if (!replyToObject || !replyToObject.url || !replyToObject.name) {
                return false;
            }

            // Verify that the reply is to a post created by the user by
            // checking that the hostname associated with the reply object
            // is the same as the hostname of the site. This is not a bullet
            // proof check, but it's a good enough for now
            const hostname = new URL(siteUrl).hostname;
            const replyToObjectHostname = new URL(replyToObject.url).hostname;

            return hostname === replyToObjectHostname;
        }

        return [ACTVITY_TYPE.FOLLOW, ACTVITY_TYPE.LIKE].includes(activity.type);
    });

    // Create a map of activity comments, grouping them by the parent activity
    // This allows us to quickly look up all comments for a given activity
    const commentsMap = new Map<string, Activity[]>();

    for (const activity of activities) {
        if (activity.type === ACTVITY_TYPE.CREATE && activity.object?.inReplyTo) {
            const comments = commentsMap.get(activity.object.inReplyTo) ?? [];

            comments.push(activity);

            commentsMap.set(activity.object.inReplyTo, comments.reverse());
        }
    }

    const getCommentsForObject = (id: string) => {
        return commentsMap.get(id) ?? [];
    };

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
                                            comments: getCommentsForObject(activity.object.id),
                                            allComments: commentsMap
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
                                    <div className=''>{getActivityDescription(activity, activityObjectsMap)}</div>
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
