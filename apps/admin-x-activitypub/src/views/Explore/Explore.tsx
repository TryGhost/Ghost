import Layout from '@components/layout';
import React from 'react';
import {Button, H4, LucideIcon, Separator} from '@tryghost/shade';
import {SuggestedProfile} from '@src/components/modals/Search';
import {useExploreProfilesForUser} from '@hooks/use-activity-pub-queries';
import {useOnboardingStatus} from '@src/components/layout/Onboarding';

const Profile: React.FC = () => {
    const {isExplainerClosed, setExplainerClosed} = useOnboardingStatus();
    const {exploreProfilesQuery} = useExploreProfilesForUser('index');
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
                <div className='relative mt-6 flex items-center gap-1 rounded-md bg-gradient-to-r from-[#CFB0FF66] to-[#B6E8FF66] p-5'>
                    <LucideIcon.Sprout className='text-purple' size={42} strokeWidth={0.75} />
                    <div className='mt-1 flex flex-col gap-[2px]'>
                        <H4>Get started by following</H4>
                        <p className='text-sm text-gray-800'>If you want followers then follow others.</p>
                    </div>
                    <Button className='absolute right-3 top-3 h-6 w-6 opacity-40' variant='link' onClick={() => setExplainerClosed(true)}><LucideIcon.X size={20} /></Button>
                </div>
            }
            <div className='mt-12 flex flex-col gap-8'>
                {
                    isLoadingExploreProfiles ? (
                        <div>
                            {emptyProfiles.map(profile => (
                                <div key={profile.actor.id} className='mx-auto w-full max-w-[640px]'>
                                    <SuggestedProfile
                                        isLoading={isLoadingExploreProfiles}
                                        profile={profile}
                                        update={() => {}}
                                        onOpenChange={() => {}}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        exploreProfilesData && Object.entries(exploreProfilesData).map(([category, data]) => (
                            <div key={category} className='mx-auto flex w-full max-w-[640px] flex-col items-center'>
                                <H4 className='mb-4 w-full text-xl font-semibold'>
                                    {data.categoryName}
                                </H4>
                                <Separator />
                                {data.sites.map(profile => (
                                    <React.Fragment key={profile.actor.id}>
                                        <SuggestedProfile
                                            isLoading={false}
                                            profile={profile}
                                            update={() => {}}
                                            onOpenChange={() => {}}
                                        />
                                    </React.Fragment>
                                ))}
                            </div>
                        ))
                    )
                }
            </div>
        </Layout>
    );
};

export default Profile;
