import Layout from '@components/layout';
import React from 'react';
import {Button, LucideIcon} from '@tryghost/shade';
import {SuggestedProfiles} from '@src/components/modals/Search';
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
            <SuggestedProfiles
                isLoading={isLoadingSuggestedProfiles}
                profiles={suggestedProfiles}
                onOpenChange={() => {}}
                onUpdate={updateSuggestedProfile}
            />
        </Layout>
    );
};

export default Profile;
