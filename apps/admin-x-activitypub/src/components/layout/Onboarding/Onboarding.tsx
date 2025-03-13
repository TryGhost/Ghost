import React from 'react';
import {Outlet} from '@tryghost/admin-x-framework';
import {parseAccessibilitySettings, updateAccessibilitySettings} from '@utils/accessibility';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useEditUser} from '@tryghost/admin-x-framework/api/users';

export const useOnboardingStatus = () => {
    const {data: currentUser} = useCurrentUser();
    const {mutateAsync: updateUser} = useEditUser();

    const isOnboarded = React.useMemo(() => {
        if (!currentUser?.accessibility) {
            return false;
        }
        const settings = parseAccessibilitySettings(currentUser.accessibility);
        return !!settings.apOnboarded;
    }, [currentUser?.accessibility]);

    const setOnboarded = React.useCallback(async (onboarded: boolean) => {
        if (!currentUser) {
            return;
        }

        const newSettings = updateAccessibilitySettings(
            currentUser.accessibility,
            {apOnboarded: onboarded}
        );

        await updateUser({
            ...currentUser,
            accessibility: newSettings
        });
    }, [currentUser, updateUser]);

    return {isOnboarded, setOnboarded};
};

const Onboarding: React.FC = () => {
    return (
        <div className='h-full pt-14'>
            <Outlet />
        </div>
    );
};

export default Onboarding;
