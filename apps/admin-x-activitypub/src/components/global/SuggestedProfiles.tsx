import APAvatar from './APAvatar';
import ActivityItem from '../activities/ActivityItem';
import FollowButton from './FollowButton';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import ViewProfileModal from '../modals/ViewProfileModal';
import {type Profile} from '../../api/activitypub';
import {Skeleton} from '@tryghost/shade';
import {useSuggestedProfilesForUser} from '@src/hooks/use-activity-pub-queries';

interface SuggestedProfileProps {
    profile: Profile;
    update: (id: string, updated: Partial<Profile>) => void;
    isLoading: boolean;
}

export const SuggestedProfile: React.FC<SuggestedProfileProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({profile, update, isLoading, onOpenChange}) => {
    const onFollow = () => {
        update(profile.actor.id, {
            isFollowing: true,
            followerCount: profile.followerCount + 1
        });
    };

    const onUnfollow = () => {
        update(profile.actor.id, {
            isFollowing: false,
            followerCount: profile.followerCount - 1
        });
    };

    return (
        <ActivityItem
            key={profile.actor.id}
            onClick={() => {
                onOpenChange?.(false);
                NiceModal.show(ViewProfileModal, {handle: profile.handle, onFollow, onUnfollow});
            }}
        >
            <APAvatar author={profile.actor} onClick={() => onOpenChange?.(false)} />
            <div className='flex grow flex-col'>
                <span className='font-semibold text-black dark:text-white'>{!isLoading ? profile.actor.name : <Skeleton className='w-full max-w-64' />}</span>
                <span className='text-sm text-gray-700 dark:text-gray-600'>{!isLoading ? profile.handle : <Skeleton className='w-24' />}</span>
            </div>
            {!isLoading ?
                <FollowButton
                    className='ml-auto'
                    following={profile.isFollowing}
                    handle={profile.handle}
                    type='secondary'
                    onFollow={onFollow}
                    onUnfollow={onUnfollow}
                /> :
                <div className='inline-flex items-center'>
                    <Skeleton className='w-12' />
                </div>
            }
        </ActivityItem>
    );
};

export const SuggestedProfiles: React.FC<{
    onOpenChange?: (open: boolean) => void;
}> = ({onOpenChange}) => {
    const {suggestedProfilesQuery, updateSuggestedProfile} = useSuggestedProfilesForUser('index', 5);
    const {data: suggestedProfilesData, isLoading: isLoadingSuggestedProfiles} = suggestedProfilesQuery;
    const suggestedProfiles = suggestedProfilesData || Array(5).fill({
        actor: {},
        handle: '',
        followerCount: 0,
        followingCount: 0,
        isFollowing: false
    });

    return (
        <div className='mb-[-15px] flex flex-col gap-3 pt-2'>
            <div className='flex flex-col'>
                {suggestedProfiles.map((profile) => {
                    return (
                        <React.Fragment key={profile.actor.id}>
                            <SuggestedProfile
                                isLoading={isLoadingSuggestedProfiles}
                                profile={profile}
                                update={updateSuggestedProfile}
                                onOpenChange={onOpenChange}
                            />
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};