import APAvatar from '@src/components/global/APAvatar';
import FollowButton from '@src/components/global/FollowButton';
import ProfilePreviewHoverCard from '@components/global/ProfilePreviewHoverCard';
import {Account} from '@src/api/activitypub';
import {Button, H4, LucideIcon, Separator, Skeleton} from '@tryghost/shade';
import {useEffect, useRef, useState} from 'react';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';
import {useSuggestedProfilesForUser} from '@src/hooks/use-activity-pub-queries';

const SuggestedProfiles: React.FC = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigateWithBasePath();
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const {suggestedProfilesQuery, updateSuggestedProfile} = useSuggestedProfilesForUser('index', 10);
    const {data: suggestedProfilesData = [], isLoading: isLoadingSuggestedProfiles} = suggestedProfilesQuery;

    useEffect(() => {
        updateScrollButtons();
    }, [suggestedProfilesData]);

    if (!isLoadingSuggestedProfiles && (!suggestedProfilesData || suggestedProfilesData.length < 4)) {
        return null;
    }

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

    const updateScrollButtons = () => {
        const container = scrollContainerRef.current;
        if (!container) {
            return;
        }

        const canScrollL = container.scrollLeft > 0;
        const canScrollR = container.scrollLeft < container.scrollWidth - container.clientWidth;

        setCanScrollLeft(canScrollL);
        setCanScrollRight(canScrollR);
    };

    const scrollLeft = () => {
        const container = scrollContainerRef.current;
        if (!container) {
            return;
        }

        const cardWidth = 160 + 16; // w-40 (160px) + gap-4 (16px)
        container.scrollBy({left: -cardWidth * 2, behavior: 'smooth'});
    };

    const scrollRight = () => {
        const container = scrollContainerRef.current;
        if (!container) {
            return;
        }

        const cardWidth = 160 + 16; // w-40 (160px) + gap-4 (16px)
        container.scrollBy({left: cardWidth * 2, behavior: 'smooth'});
    };

    return (
        <>
            <div className='pb-7 pt-4'>
                <div className='mb-3 flex items-center justify-between'>
                    <H4 className='text-lg font-semibold text-black dark:text-white'>More people to follow</H4>
                    <Button className='px-0 font-medium text-gray-700 hover:text-black dark:text-gray-600 dark:hover:text-white' variant='link' onClick={() => navigate('/explore')}>
                    Find more &rarr;
                    </Button>
                </div>

                <div className='relative'>
                    {canScrollLeft && (
                        <Button
                            className='absolute -left-10 top-1/2 z-10 size-10 -translate-y-1/2 text-gray-700 hover:bg-transparent max-lg:hidden dark:text-gray-600 dark:hover:text-white'
                            variant='ghost'
                            onClick={scrollLeft}
                        >
                            <LucideIcon.ChevronLeft className='!size-6' />
                        </Button>
                    )}

                    {canScrollRight && (
                        <Button
                            className='absolute -right-10 top-1/2 z-10 size-10 -translate-y-1/2 text-gray-700 hover:bg-transparent max-lg:hidden dark:text-gray-600 dark:hover:text-white'
                            variant='ghost'
                            onClick={scrollRight}
                        >
                            <LucideIcon.ChevronRight className='!size-6' />
                        </Button>
                    )}

                    <div
                        ref={scrollContainerRef}
                        className='flex snap-x snap-mandatory gap-4 overflow-x-auto'
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}
                        onScroll={updateScrollButtons}
                    >
                        {(isLoadingSuggestedProfiles ? Array(10).fill(null) : (suggestedProfilesData || [])).map((profile, index) => (
                            <div
                                key={profile?.id || `loading-${index}`}
                                className='relative w-40 shrink-0 snap-start rounded-lg bg-gray-75 p-4 dark:bg-gray-925/30'
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
                                            <ProfilePreviewHoverCard actor={profile} align='center'>
                                                <div>
                                                    <APAvatar
                                                        author={{
                                                            icon: {url: profile?.avatarUrl || ''},
                                                            name: profile?.name || '',
                                                            handle: profile?.handle || ''
                                                        }}
                                                        size='md'
                                                    />
                                                </div>
                                            </ProfilePreviewHoverCard>
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
            </div>
            <Separator />
        </>
    );
};

export default SuggestedProfiles;
