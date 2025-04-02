import APAvatar from '@src/components/global/APAvatar';
import FollowButton from '@src/components/global/FollowButton';
import Layout from '@components/layout';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import ViewProfileModal from '@src/components/modals/ViewProfileModal';
import {Button, H4, LucideIcon, Skeleton} from '@tryghost/shade';
import {type Profile} from '@src/api/activitypub';
import {useExploreProfilesForUser} from '@hooks/use-activity-pub-queries';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useOnboardingStatus} from '@src/components/layout/Onboarding';

interface ExploreProfileProps {
    profile: Profile;
    update: (id: string, updated: Partial<Profile>) => void;
    isLoading: boolean;
}

export const ExploreProfile: React.FC<ExploreProfileProps & {
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

    const {isEnabled} = useFeatureFlags();
    const navigate = useNavigate();

    return (
        <div
            className='flex w-full cursor-pointer items-start gap-3 pt-4 [&:last-of-type>:nth-child(2)]:border-none'
            onClick={() => {
                if (isEnabled('ap-routes')) {
                    navigate(`/profile-rr/${profile.handle}`);
                } else {
                    onOpenChange?.(false);
                    NiceModal.show(ViewProfileModal, {handle: profile.handle, onFollow, onUnfollow});
                }
            }}
        >
            <APAvatar author={profile.actor} onClick={() => onOpenChange?.(false)} />
            <div className='flex w-full flex-col gap-2 border-b border-gray-200 pb-4 dark:border-gray-950'>
                <div className='flex items-center justify-between gap-3'>
                    <div className='flex grow flex-col'>
                        <span className='font-semibold text-black dark:text-white'>{!isLoading ? profile.actor.name : <Skeleton className='w-full max-w-64' />}</span>
                        <span className='text-sm text-gray-600'>{!isLoading ? profile.handle : <Skeleton className='w-24' />}</span>
                    </div>
                    {!isLoading ?
                        <FollowButton
                            className='ml-auto'
                            following={profile.isFollowing}
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
                {profile.actor.summary &&
                    <div
                        dangerouslySetInnerHTML={{__html: profile.actor.summary}}
                        className='ap-profile-content pointer-events-none mt-0 max-w-[500px]'
                    />
                }
            </div>
        </div>
    );
};

const Explore: React.FC = () => {
    const {isExplainerClosed, setExplainerClosed} = useOnboardingStatus();
    const {exploreProfilesQuery, updateExploreProfile} = useExploreProfilesForUser('index');
    const {data: exploreProfilesData, isLoading: isLoadingExploreProfiles} = exploreProfilesQuery;

    const emptyProfiles = Array(5).fill({
        actor: {},
        handle: '',
        followerCount: 0,
        followingCount: 0,
        isFollowing: false
    });

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
                    <Button className='absolute right-4 top-[17px] h-6 w-6 opacity-40' variant='link' onClick={() => setExplainerClosed(true)}><LucideIcon.X size={20} /></Button>
                </div>
            }
            <div className='mt-12 flex flex-col gap-12 pb-20'>
                {
                    isLoadingExploreProfiles ? (
                        <div>
                            {emptyProfiles.map(profile => (
                                <div key={profile.actor.id} className='mx-auto w-full max-w-[640px]'>
                                    <ExploreProfile
                                        isLoading={isLoadingExploreProfiles}
                                        profile={profile}
                                        update={() => {}}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        exploreProfilesData && Object.entries(exploreProfilesData).map(([category, data]) => (
                            <div key={category} className='mx-auto flex w-full max-w-[640px] flex-col items-center'>
                                <H4 className='w-full border-b border-gray-200 pb-2 text-xs font-medium uppercase tracking-wider text-gray-800 dark:border-gray-900'>
                                    {data.categoryName}
                                </H4>
                                <div className='w-full'>
                                    {data.sites.map(profile => (
                                        <React.Fragment key={profile.actor.id}>
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
            </div>
        </Layout>
    );
};

export default Explore;
