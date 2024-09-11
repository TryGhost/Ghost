import React from 'react';

import APAvatar, {AvatarBadge} from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import MainNavigation from './navigation/MainNavigation';
import {Button} from '@tryghost/admin-x-design-system';

import getUsername from '../utils/get-username';
import {useBrowseInboxForUser, useBrowseOutboxForUser, useFollowersForUser} from '../MainContent';

interface ActivitiesProps {}

// eslint-disable-next-line no-shadow
enum ACTVITY_TYPE {
    CREATE = 'Create',
    LIKE = 'Like',
    FOLLOW = 'Follow'
}

type Actor = {
    id: string
    name: string
    preferredUsername: string
    url: string
}

type ActivityObject = {
    name: string
    url: string
    inReplyTo: string | null
    content: string
}

type Activity = {
    id: string
    type: ACTVITY_TYPE
    object?: ActivityObject
    actor: Actor
}

const getActivityDescription = (activity: Activity, activityObjectsMap: Map<string, ActivityObject>): string => {
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
                className='ml-2 mt-2 text-sm text-grey-600'
            />
        );
    }

    return null;
};

const getActivityUrl = (activity: Activity): string | null => {
    if (activity.object) {
        return activity.object.url;
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
        return 'user-fill'; // TODO: Change this
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

    // Retrieve activities from the inbox AND the outbox
    // Why the need for the outbox? The outbox contains activities that the user
    // has performed, and we sometimes need information about the object
    // associated with the activity (i.e when displaying the name of an article
    // that a reply was made to)
    const {data: inboxActivities = []} = useBrowseInboxForUser(user);
    const {data: outboxActivities = []} = useBrowseOutboxForUser(user);

    // Create a map of activity objects from activities in the inbox and outbox.
    // This allows us to quickly look up an object associated with an activity
    // We could just make a http request to get the object, but this is more
    // efficient seeming though we already have the data in the inbox and outbox
    const activityObjectsMap = new Map<string, ActivityObject>();

    outboxActivities.forEach((activity) => {
        if (activity.object) {
            activityObjectsMap.set(activity.object.id, activity.object);
        }
    });
    inboxActivities.forEach((activity) => {
        if (activity.object) {
            activityObjectsMap.set(activity.object.id, activity.object);
        }
    });

    // Filter the activities to show
    const activities = inboxActivities.filter((activity) => {
        // Only show "Create" activities that are replies to a post created
        // by the user
        if (activity.type === ACTVITY_TYPE.CREATE) {
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
            const hostname = new URL(window.location.href).hostname;
            const replyToObjectHostname = new URL(replyToObject.url).hostname;

            return hostname === replyToObjectHostname;
        }

        return [ACTVITY_TYPE.FOLLOW, ACTVITY_TYPE.LIKE].includes(activity.type);
    })
        // API endpoint currently returns items oldest-newest, so reverse them
        // to show the most recent activities first
        .reverse();

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
                    <div className='mt-8 font-bold'>This is an empty state when there are no activities</div>
                )}
                {activities.length > 0 && (
                    <div className='mt-8 flex w-full max-w-[560px] flex-col'>
                        {activities?.map(activity => (
                            <ActivityItem key={activity.id} url={getActivityUrl(activity) || getActorUrl(activity)}>
                                <APAvatar author={activity.actor} badge={getActivityBadge(activity)} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{activity.actor.name}</span>
                                        {getUsername(activity.actor)}
                                    </div>
                                    <div className='text-sm'>{getActivityDescription(activity, activityObjectsMap)}</div>
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
