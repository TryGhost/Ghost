import APAvatar from '@src/components/global/APAvatar';
import FollowButton from '@src/components/global/FollowButton';
import Layout from '@components/layout';
import ProfilePreviewHoverCard from '@components/global/ProfilePreviewHoverCard';
import React, {useEffect, useState} from 'react';
import TopicFilter, {type Topic} from '@src/components/TopicFilter';
import {type Account} from '@src/api/activitypub';
import {Button, H4, LoadingIndicator, LucideIcon, Skeleton} from '@tryghost/shade';
import {formatFollowNumber} from '@src/utils/content-formatters';
import {useAccountForUser, useExploreProfilesForUser, useExploreProfilesForUserByTopic} from '@hooks/use-activity-pub-queries';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useNavigateWithBasePath} from '@src/hooks/use-navigate-with-base-path';
import {useOnboardingStatus} from '@src/components/layout/Onboarding';

interface ExploreProfileProps {
    profile: Account;
    update: (id: string, updated: Partial<Account>) => void;
    isLoading: boolean;
}

export const ExploreProfile: React.FC<ExploreProfileProps & {
    onOpenChange?: (open: boolean) => void;
}> = ({profile, update, isLoading, onOpenChange}) => {
    const currentAccountQuery = useAccountForUser('index', 'me');
    const {data: currentUser} = currentAccountQuery;
    const isCurrentUser = profile.handle === currentUser?.handle;

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
        <div
            className='flex w-full cursor-pointer items-start gap-3 pt-4 [&:last-of-type>:nth-child(2)]:border-none'
            onClick={() => {
                navigate(`/profile/${profile.handle}`);
            }}
        >
            <div className='flex w-full flex-col gap-1 border-b border-gray-200 pb-4 dark:border-gray-950'>
                <div className='flex items-center justify-between gap-3'>
                    <ProfilePreviewHoverCard actor={profile} isCurrentUser={isCurrentUser}>
                        <div className='flex gap-3'>
                            <APAvatar author={
                                {
                                    icon: {
                                        url: profile.avatarUrl
                                    },
                                    name: profile.name,
                                    handle: profile.handle
                                }
                            } onClick={() => onOpenChange?.(false)} />
                            <div className='-mt-0.5 flex grow flex-col break-anywhere'>
                                <span className='line-clamp-1 font-semibold text-black dark:text-white'>{!isLoading ? profile.name : <Skeleton className='w-full max-w-48' />}</span>
                                <span className='line-clamp-1 text-md text-gray-700 dark:text-gray-600'>{!isLoading ? profile.handle : <Skeleton className='w-32' />}</span>
                            </div>
                        </div>
                    </ProfilePreviewHoverCard>
                    {!isLoading ? (
                        !isCurrentUser ? (
                            <FollowButton
                                className='ml-auto'
                                following={profile.followedByMe}
                                handle={profile.handle}
                                type='primary'
                                onFollow={onFollow}
                                onUnfollow={onUnfollow}
                            />
                        ) : null
                    ) : (
                        <div className='inline-flex items-center'>
                            <Skeleton className='w-24' />
                        </div>
                    )}
                </div>
                <div className='pl-[52px]'>
                    {isLoading ?
                        <Skeleton className='w-full max-w-96' />
                        :
                        profile.bio &&
                        <div
                            dangerouslySetInnerHTML={{__html: profile.bio}}
                            className='ap-profile-content pointer-events-none mt-0 line-clamp-2 max-w-[460px] break-anywhere'
                        />
                    }
                    {!isLoading ?
                        <div className='mt-2 flex items-center gap-1 text-sm text-gray-700 dark:text-gray-600'>
                            <LucideIcon.UserRound size={14} strokeWidth={1.5} />
                            {formatFollowNumber(profile.followerCount)} followers
                        </div>
                        :
                        <Skeleton className='w-24' />
                    }
                </div>
            </div>
        </div>
    );
};

const Explore: React.FC = () => {
    const {isExplainerClosed, setExplainerClosed} = useOnboardingStatus();
    const {isEnabled} = useFeatureFlags();
    const isTopicFilteringEnabled = isEnabled('explore-topic');
    const [topic, setTopic] = useState<Topic>('top');

    const topicBasedQuery = useExploreProfilesForUserByTopic('index', topic);
    const legacyQuery = useExploreProfilesForUser('index');

    const shouldUseLegacy = !isTopicFilteringEnabled;
    const {exploreProfilesQuery, updateExploreProfile} = shouldUseLegacy ? legacyQuery : topicBasedQuery;
    const {data: exploreProfilesData, isLoading: isLoadingExploreProfiles, fetchNextPage, hasNextPage, isFetchingNextPage} = exploreProfilesQuery;

    const emptyProfiles = Array(10).fill(null).map((_, i) => ({
        id: `skeleton-${i}`,
        name: '',
        handle: '',
        avatarUrl: '',
        bio: '',
        followerCount: 0,
        followingCount: 0,
        followedByMe: false
    }));


    const profiles = shouldUseLegacy
        ? (exploreProfilesData?.pages.flatMap(page => Object.values(page.results).flatMap(category => category.sites)
        ) || [])
        : (exploreProfilesData?.pages.flatMap(page => page.accounts) || []);

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
            {isTopicFilteringEnabled && (
                <TopicFilter currentTopic={topic} excludeTopics={['following']} onTopicChange={setTopic} />
            )}
            <div className='mt-12 flex flex-col gap-12 pb-20 max-md:mt-5'>
                {isLoadingExploreProfiles ? (
                    <div>
                        {emptyProfiles.map((profile) => (
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
                    <div className='mx-auto flex w-full max-w-[640px] flex-col items-center'>
                        <div className='w-full'>
                            {profiles.map(profile => (
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
                )}
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
