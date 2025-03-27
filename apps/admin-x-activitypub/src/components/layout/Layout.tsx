import Header from './Header';
import Onboarding, {useOnboardingStatus} from './Onboarding';
import React, {useEffect} from 'react';
import Sidebar from './Sidebar';
import {Navigate} from '@tryghost/admin-x-framework';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useExploreProfilesForUser} from '@src/hooks/use-activity-pub-queries';

const Layout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, ...props}) => {
    const {isOnboarded} = useOnboardingStatus();
    const {data: currentUser, isLoading} = useCurrentUser();
    const {prefetchExploreProfiles} = useExploreProfilesForUser('index');

    useEffect(() => {
        prefetchExploreProfiles();
    }, [prefetchExploreProfiles]);

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
                        <div className='grid grid-cols-[auto_320px] items-start'>
                            <div className='z-0'>
                                <Header />
                                <div className='px-8'>
                                    {children}
                                </div>
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
