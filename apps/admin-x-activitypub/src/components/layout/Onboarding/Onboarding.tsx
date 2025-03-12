import React, {useState} from 'react';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
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
    const {setOnboarded} = useOnboardingStatus();
    const [currentStep, setCurrentStep] = useState(1);

    const handleComplete = async () => {
        await setOnboarded(true);
    };

    return (
        <div className='h-full pt-14'>
            {currentStep === 1 && (
                <Step1 onNext={() => setCurrentStep(2)} />
            )}
            {currentStep === 2 && (
                <Step2 onNext={() => setCurrentStep(3)} />
            )}
            {currentStep === 3 && (
                <Step3 onComplete={handleComplete} />
            )}
        </div>
    );
};

export default Onboarding;
