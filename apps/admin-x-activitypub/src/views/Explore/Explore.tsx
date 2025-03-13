import Layout from '@components/layout';
import React from 'react';
import {Button, H4, LucideIcon} from '@tryghost/shade';
import {SuggestedProfile} from '@src/components/modals/Search';
import {useOnboardingStatus} from '@src/components/layout/Onboarding';
import {useSuggestedProfilesForUser} from '@hooks/use-activity-pub-queries';

const Profile: React.FC = ({ }) => {
    const {suggestedProfilesQuery, updateSuggestedProfile} = useSuggestedProfilesForUser('index', 20);
    const {data: suggestedProfilesData, isLoading: isLoadingSuggestedProfiles} = suggestedProfilesQuery;
    const suggestedProfiles = suggestedProfilesData || Array(5).fill({
        actor: {},
        handle: '',
        followerCount: 0,
        followingCount: 0,
        isFollowing: false
    });
    const {isExplainerClosed, setExplainerClosed} = useOnboardingStatus();

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
            <div className='mt-12 flex flex-col items-center'>
                {
                    suggestedProfiles.map(profile => (
                        <React.Fragment key={profile.actor.id}>
                            <SuggestedProfile
                                isLoading={isLoadingSuggestedProfiles}
                                profile={profile}
                                update={updateSuggestedProfile}
                                onOpenChange={() => {}}
                            />
                        </React.Fragment>
                    ))
                }
            </div>
        </Layout>
    );
};

export default Profile;
