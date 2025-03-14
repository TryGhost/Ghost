import Header from './Header';
import Onboarding, {useOnboardingStatus} from './Onboarding';
import React, {useEffect} from 'react';
import Sidebar from './Sidebar';
import {Navigate} from '@tryghost/admin-x-framework';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useExploreProfilesForUser} from '@src/hooks/use-activity-pub-queries';
import {useFeatureFlags} from '@src/lib/feature-flags';

const Layout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    const {isEnabled} = useFeatureFlags();
    const {isOnboarded: onboardingStatus} = useOnboardingStatus();
    const {data: currentUser, isLoading} = useCurrentUser();
    const {prefetchExploreProfiles} = useExploreProfilesForUser('index');

    useEffect(() => {
        prefetchExploreProfiles();
    }, [prefetchExploreProfiles]);

    const isOnboarded = isEnabled('onboarding') ? onboardingStatus : true;

    if (isLoading || !currentUser) {
        return null;
    }

    if (!isOnboarded) {
        return <Navigate to={`/welcome`} replace />;
    }

    return (
        <div className={`h-screen w-full ${isOnboarded && 'overflow-y-auto'}`}>
            <div className='relative mx-auto flex max-w-page flex-col' {...props}>
                {isOnboarded ?
                    <>
                        <Header />
                        <div className='grid grid-cols-[auto_292px] items-start gap-8 px-8'>
                            <div className='z-0'>
                                {children}
                            </div>
                            <Sidebar />
                        </div>
                    </> :
                    <Onboarding />
                }
            </div>
        </div>
    );
};

export default Layout;
