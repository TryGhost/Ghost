import APAvatar from './global/APAvatar';
import ActivityItem from './activities/ActivityItem';
import MainNavigation from './navigation/MainNavigation';
import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {useBrowseInboxForUser, useFollowersForUser} from '../MainContent';

interface ActivitiesProps {}

// eslint-disable-next-line no-shadow
enum ACTVITY_TYPE {
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
}

type Activity = {
    id: string
    type: ACTVITY_TYPE
    object?: ActivityObject
    actor: Actor
}

const getActorUsername = (actor: Actor): string => {
    const url = new URL(actor.url);
    const domain = url.hostname;

    return `@${actor.preferredUsername}@${domain}`;
};

const getActivityDescription = (activity: Activity): string => {
    switch (activity.type) {
    case ACTVITY_TYPE.FOLLOW:
        return 'Followed you';
    case ACTVITY_TYPE.LIKE:
        if (activity.object) {
            return `Liked your article "${activity.object.name}"`;
        }
    }

    return '';
};

const getActivityUrl = (activity: Activity): string | null => {
    if (activity.object) {
        return activity.object.url;
    }

    return null;
};

const isFollower = (id: string, followerIds: string[]): boolean => {
    return followerIds.includes(id);
};

const Activities: React.FC<ActivitiesProps> = ({}) => {
    const user = 'index';
    const {data: activityData} = useBrowseInboxForUser(user);
    const activities = (activityData || [])
        .filter((activity) => {
            return [ACTVITY_TYPE.FOLLOW, ACTVITY_TYPE.LIKE].includes(activity.type);
        })
        .reverse(); // Endpoint currently returns items oldest-newest
    const {data: followerData} = useFollowersForUser(user);
    const followers = followerData || [];

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
                            <ActivityItem key={activity.id} url={getActivityUrl(activity)}>
                                <APAvatar author={activity.actor} />
                                <div>
                                    <div className='text-grey-600'>
                                        <span className='mr-1 font-bold text-black'>{activity.actor.name}</span>
                                        {getActorUsername(activity.actor)}
                                    </div>
                                    <div className='text-sm'>{getActivityDescription(activity)}</div>
                                </div>
                                {isFollower(activity.actor.id, followers) === false && (
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
