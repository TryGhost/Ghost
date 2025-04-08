import APAvatar from '@src/components/global/APAvatar';
import FollowButton from '@src/components/global/FollowButton';
import Layout from '@components/layout';
import React, {useEffect} from 'react';
import {type Account} from '@src/api/activitypub';
import {Button, H4, LucideIcon, Skeleton} from '@tryghost/shade';
import {LoadingIndicator} from '@tryghost/admin-x-design-system';
import {formatFollowNumber} from '@src/utils/content-formatters';
import {useExploreProfilesForUser} from '@hooks/use-activity-pub-queries';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useOnboardingStatus} from '@src/components/layout/Onboarding';

interface ExploreProfileProps {
    profile: Account;
    update: (id: string, updated: Partial<Account>) => void;
    isLoading: boolean;
}

export const ExploreProfile: React.FC<ExploreProfileProps & {
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

    const navigate = useNavigate();

    return (
        <div
            className='flex w-full cursor-pointer items-start gap-3 pt-4 [&:last-of-type>:nth-child(2)]:border-none'
            onClick={() => {
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
            <div className='flex w-full flex-col gap-1 border-b border-gray-200 pb-4 dark:border-gray-950'>
                <div className='flex items-center justify-between gap-3'>
                    <div className='flex grow flex-col'>
                        <span className='font-semibold text-black dark:text-white'>{!isLoading ? profile.name : <Skeleton className='w-full max-w-64' />}</span>
                        <span className='text-sm text-gray-700'>{!isLoading ? profile.handle : <Skeleton className='w-24' />}</span>
                    </div>
                    {!isLoading ?
                        <FollowButton
                            className='ml-auto'
                            following={profile.followedByMe}
                            handle={profile.handle}
                            type='primary'
                            onFollow={onFollow}
                            onUnfollow={onUnfollow}
                        /> :
                        <div className='inline-flex items-center'>
                            <Skeleton className='w-12' />
                        </div>
                    }
                </div>
                {profile.bio &&
                    <div
                        dangerouslySetInnerHTML={{__html: profile.bio}}
                        className='ap-profile-content pointer-events-none mt-0 max-w-[500px]'
                    />
                }
                {!isLoading &&
                <div className='mt-2 flex items-center gap-1 text-sm text-gray-700'>
                    <LucideIcon.UserRound size={14} strokeWidth={1.5} />
                    {formatFollowNumber(profile.followerCount)} followers
                </div>
                }
            </div>
        </div>
    );
};

const Explore: React.FC = () => {
    const {isExplainerClosed, setExplainerClosed} = useOnboardingStatus();
    const {exploreProfilesQuery, updateExploreProfile} = useExploreProfilesForUser('index');
    const {data: exploreProfilesData, isLoading: isLoadingExploreProfiles, fetchNextPage, hasNextPage, isFetchingNextPage} = exploreProfilesQuery;

    const emptyProfiles = Array(5).fill({
        id: '',
        name: '',
        handle: '',
        avatarUrl: '',
        bio: '',
        followerCount: 0,
        followingCount: 0,
        followedByMe: false
    });

    // Merge all pages of results
    const allProfiles = exploreProfilesData?.pages.reduce((acc, page) => {
        Object.entries(page.results).forEach(([key, category]) => {
            if (!acc[key]) {
                acc[key] = category;
            } else {
                // Only add profiles that haven't been seen before
                const existingProfileIds = new Set(acc[key].sites.map(p => p.id));
                const newProfiles = category.sites.filter(profile => !existingProfileIds.has(profile.id));
                acc[key].sites = [...acc[key].sites, ...newProfiles];
            }
        });
        return acc;
    }, {} as Record<string, { categoryName: string; sites: Account[] }>) || {};

    useEffect(() => {
        const node = document.querySelector('.load-more-trigger');
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            {threshold: 0.1}
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <Layout>
            {!isExplainerClosed &&
                <div className='relative mt-6 flex items-start gap-1 rounded-md bg-gradient-to-r from-[#CFB0FF66] to-[#B6E8FF66] p-4 pr-10 dark:from-[#CFB0FF20] dark:to-[#B6E8FF20]'>
                    <div className='min-w-[46px]'>
                        <LucideIcon.Sprout className='text-purple' size={46} strokeWidth={0.75} />
                    </div>
                    <div className='mt-1 flex flex-col gap-[2px]'>
                        <H4 className='text-pretty'>The fastest way to grow your followers, is to follow others!</H4>
                        <p className='2xl:text-pretty text-balance text-sm text-black/60 dark:text-white/60'>Here are some recommendations to get you started, from Ghost publishers and other great accounts from around the social web.</p>
                    </div>
                    <Button className='absolute right-4 top-[17px] size-6 opacity-40' variant='link' onClick={() => setExplainerClosed(true)}><LucideIcon.X size={20} /></Button>
                </div>
            }
            <div className='mt-12 flex flex-col gap-12 pb-20'>
                {
                    isLoadingExploreProfiles ? (
                        <div>
                            {emptyProfiles.map(profile => (
                                <div key={profile.id} className='mx-auto w-full max-w-[640px]'>
                                    <ExploreProfile
                                        isLoading={isLoadingExploreProfiles}
                                        profile={profile}
                                        update={() => {}}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        Object.entries(allProfiles).map(([category, data]) => (
                            <div key={category} className='mx-auto flex w-full max-w-[640px] flex-col items-center'>
                                {category !== 'uncategorized' &&
                                    <H4 className='w-full border-b border-gray-200 pb-2 text-xs font-medium uppercase tracking-wider text-gray-800 dark:border-gray-900'>
                                        {data.categoryName}
                                    </H4>
                                }
                                <div className='w-full'>
                                    {data.sites.map(profile => (
                                        <React.Fragment key={profile.id}>
                                            <ExploreProfile
                                                isLoading={false}
                                                profile={profile}
                                                update={updateExploreProfile}
                                            />
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))
                    )
                }
                <div className='load-more-trigger h-4 w-full' />
                {isFetchingNextPage && (
                    <div className='flex justify-center'>
                        <LoadingIndicator size='sm' />
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Explore;
