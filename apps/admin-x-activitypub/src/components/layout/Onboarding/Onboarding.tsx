import React, {useEffect} from 'react';
import {ApOnboardingSettings, parseAccessibilitySettings, updateAccessibilitySettings} from '@utils/accessibility';
import {Outlet} from '@tryghost/admin-x-framework';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useEditUser} from '@tryghost/admin-x-framework/api/users';
import {useExploreProfilesForUser} from '@src/hooks/use-activity-pub-queries';

export const useOnboardingStatus = () => {
    const {data: currentUser} = useCurrentUser();
    const {mutateAsync: updateUser} = useEditUser();

    const settings = React.useMemo(() => {
        if (!currentUser?.accessibility) {
            return {};
        }
        const parsed = parseAccessibilitySettings(currentUser.accessibility);
        return parsed.apOnboarding || {};
    }, [currentUser?.accessibility]);

    const updateSettings = React.useCallback(async (updates: Partial<ApOnboardingSettings>) => {
        if (!currentUser) {
            return;
        }

        const currentSettings = parseAccessibilitySettings(currentUser.accessibility);
        const newSettings = updateAccessibilitySettings(
            currentUser.accessibility,
            {
                apOnboarding: {
                    ...currentSettings.apOnboarding,
                    ...updates
                }
            }
        );

        await updateUser({
            ...currentUser,
            accessibility: newSettings
        });
    }, [currentUser, updateUser]);

    return {
        isOnboarded: !!settings.welcomeStepsFinished,
        isExplainerClosed: !!settings.exploreExplainerClosed,
        setOnboarded: (onboarded: boolean) => updateSettings({welcomeStepsFinished: onboarded}),
        setExplainerClosed: (closed: boolean) => updateSettings({exploreExplainerClosed: closed})
    };
};

const Onboarding: React.FC = () => {
    const {prefetchExploreProfiles} = useExploreProfilesForUser('index');

    useEffect(() => {
        prefetchExploreProfiles();
    }, [prefetchExploreProfiles]);

    return (
        <div className='h-full pt-14'>
            <Outlet />
        </div>
    );
};

export default Onboarding;
