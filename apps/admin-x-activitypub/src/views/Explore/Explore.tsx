import Layout from '@components/layout';
import React from 'react';
import {Button, LucideIcon} from '@tryghost/shade';
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
                <div className='flex flex-col'>
                    <span>Get started by following</span>
                    <span>If you want followers then follow others.</span>
                    <Button variant='ghost' onClick={() => setExplainerClosed(true)}><LucideIcon.X /></Button>
                </div>
            }
            <div className='flex flex-col items-center'>
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
