import APAvatar from './APAvatar';
import ActivityItem from '../activities/ActivityItem';
import FollowButton from './FollowButton';
import ProfilePreviewHoverCard from '@components/global/ProfilePreviewHoverCard';
import React from 'react';
import {type Account} from '../../api/activitypub';
import {Skeleton} from '@tryghost/shade';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';
import {useSuggestedProfilesForUser} from '@hooks/use-activity-pub-queries';

interface SuggestedProfileProps {
    profile: Account;
    update: (id: string, updated: Partial<Account>) => void;
    isLoading: boolean;
}

export const SuggestedProfile: React.FC<SuggestedProfileProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({profile, update, isLoading, onOpenChange}) => {
    const onFollow = () => {
        update(profile.id, {
            followedByMe: true,
            followerCount: profile.followerCount + 1
        });
    };

    const onUnfollow = () => {
        update(profile.id, {
            followedByMe: false,
            followerCount: profile.followerCount - 1
        });
    };

    const navigate = useNavigateWithBasePath();

    return (
        <ProfilePreviewHoverCard actor={profile} align='center' isCurrentUser={false} side='left'>
            <div>
                <ActivityItem
                    key={profile.id}
                    onClick={() => {
                        onOpenChange?.(false);
                        navigate(`/profile/${profile.handle}`);
                    }}
                >
                    <APAvatar author={
                        {
                            icon: {
                                url: profile.avatarUrl
                            },
                            name: profile.name,
                            handle: profile.handle
                        }
                    } onClick={() => onOpenChange?.(false)} />
                    <div className='flex grow flex-col break-anywhere'>
                        <span className='line-clamp-1 font-semibold text-black dark:text-white'>{!isLoading ? profile.name : <Skeleton className='w-full max-w-64' />}</span>
                        <span className='line-clamp-1 text-sm text-gray-700 dark:text-gray-600'>{!isLoading ? profile.handle : <Skeleton className='w-24' />}</span>
                    </div>
                    {!isLoading ?
                        <FollowButton
                            className='ml-auto'
                            following={profile.followedByMe}
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
            </div>
        </ProfilePreviewHoverCard>
    );
};

export const SuggestedProfiles: React.FC<{
    onOpenChange?: (open: boolean) => void;
}> = ({onOpenChange}) => {
    const {suggestedProfilesQuery, updateSuggestedProfile} = useSuggestedProfilesForUser('index', 5);
    const {data: suggestedProfilesData = [], isLoading: isLoadingSuggestedProfiles} = suggestedProfilesQuery;

    return (
        <div className='mb-[-15px] flex flex-col gap-3 pt-2'>
            <div className='flex flex-col'>
                {(isLoadingSuggestedProfiles ? Array(5).fill(null) : (suggestedProfilesData || [])).map((profile, index) => (
                    <React.Fragment key={profile?.id || `loading-${index}`}>
                        <SuggestedProfile
                            isLoading={isLoadingSuggestedProfiles}
                            profile={profile || {
                                id: '',
                                name: '',
                                handle: '',
                                avatarUrl: '',
                                bio: '',
                                followerCount: 0,
                                followingCount: 0,
                                followedByMe: false
                            }}
                            update={updateSuggestedProfile}
                            onOpenChange={onOpenChange}
                        />
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
