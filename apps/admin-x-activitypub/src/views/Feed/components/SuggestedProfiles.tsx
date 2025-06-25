import APAvatar from '@src/components/global/APAvatar';
import FollowButton from '@src/components/global/FollowButton';
import {Account} from '@src/api/activitypub';
import {Button, H4, LucideIcon, Skeleton} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useRef} from 'react';
import {useSuggestedProfilesForUser} from '@src/hooks/use-activity-pub-queries';

const SuggestedProfiles: React.FC = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const {suggestedProfilesQuery, updateSuggestedProfile} = useSuggestedProfilesForUser('index', 10);
    const {data: suggestedProfilesData = [], isLoading: isLoadingSuggestedProfiles} = suggestedProfilesQuery;

    const handleDismiss = (profileId: string) => {
        // TODO: Implement dismiss functionality
        void profileId;
    };

    const handleFollow = (profile: Account) => {
        updateSuggestedProfile(profile.id, {
            followedByMe: true,
            followerCount: profile.followerCount + 1
        });
    };

    const handleUnfollow = (profile: Account) => {
        updateSuggestedProfile(profile.id, {
            followedByMe: false,
            followerCount: profile.followerCount - 1
        });
    };

    return (
        <div className='pb-6 pt-5'>
            <div className='mb-3 flex items-center justify-between'>
                <H4 className='text-lg font-semibold text-black dark:text-white'>More people to follow</H4>
                <Button className='px-0 font-medium text-gray-700 hover:text-black dark:text-gray-600 dark:hover:text-white' variant='link' onClick={() => navigate('/explore')}>
                    Find more &rarr;
                </Button>
            </div>

            <div
                ref={scrollContainerRef}
                className='scrollbar-hide flex gap-4 overflow-x-auto pb-2'
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    scrollSnapType: 'x mandatory'
                }}
            >
                {(isLoadingSuggestedProfiles ? Array(10).fill(null) : suggestedProfilesData).map((profile, index) => (
                    <div
                        key={profile?.id || `loading-${index}`}
                        className='relative w-40 shrink-0 rounded-lg bg-gray-75 p-4 dark:bg-gray-925/30'
                        style={{scrollSnapAlign: 'start'}}
                        onClick={!isLoadingSuggestedProfiles && profile ? () => navigate(`/profile/${profile.handle}`) : undefined}
                    >
                        <Button
                            className='absolute right-2 top-1 hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            variant='link'
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss(profile?.id || '');
                            }}
                        >
                            <LucideIcon.X className='size-4' />
                        </Button>

                        <div className='flex flex-col items-center text-center'>
                            <div className='mb-3'>
                                {isLoadingSuggestedProfiles ? (
                                    <Skeleton className='size-16 rounded-full' />
                                ) : (
                                    <APAvatar
                                        author={{
                                            icon: {url: profile?.avatarUrl || ''},
                                            name: profile?.name || '',
                                            handle: profile?.handle || ''
                                        }}
                                        size='md'
                                    />
                                )}
                            </div>

                            <span className='w-full truncate font-semibold text-black dark:text-white'>
                                {isLoadingSuggestedProfiles ? (
                                    <Skeleton className='h-5 w-32' />
                                ) : (
                                    profile?.name || ''
                                )}
                            </span>

                            <span className='mb-4 truncate text-sm text-gray-700 dark:text-gray-600'>
                                {isLoadingSuggestedProfiles ? (
                                    <Skeleton className='h-4 w-20' />
                                ) : (
                                    `${profile?.followerCount || 0} ${(profile?.followerCount || 0) === 1 ? 'follower' : 'followers'}`
                                )}
                            </span>

                            {isLoadingSuggestedProfiles ? (
                                <Skeleton className='h-8 w-16' />
                            ) : (
                                <FollowButton
                                    following={profile?.followedByMe || false}
                                    handle={profile?.handle || ''}
                                    type='primary'
                                    onFollow={() => profile && handleFollow(profile)}
                                    onUnfollow={() => profile && handleUnfollow(profile)}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuggestedProfiles;