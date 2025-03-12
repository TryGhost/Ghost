import React, {useState} from 'react';
import Step1 from './Step1';
import Step3 from './Step3';
import {Button} from '@tryghost/shade';
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

const Step2: React.FC<{onNext: () => void}> = ({onNext}) => (
    <div className='relative h-full'>
        <div className='relative flex justify-between'>
            <div className='flex flex-col gap-4 text-xl font-medium'>
                <h1>Feel the network effect.</h1>
                <div className='flex max-w-[600px] flex-col gap-4'>
                    <p className='text-gray-800 dark:text-gray-600'>People who follow you can like, reply, repost & interact with your work. Their followers will see those interactions too, distributing your content even more widely, to a brand new audience.</p>
                    <p className='text-gray-800 dark:text-gray-600'>Best of all, you get realtime feedback and visibility when something you’ve created is spreading fast across the social web.</p>
                </div>
            </div>
            <Button className='min-w-60 bg-gradient-to-r from-purple-500 to-purple-600' size='lg' onClick={onNext}>Next →</Button>
        </div>
        <div className='mt-20'>
            Step 2 content
        </div>
    </div>
);

const Onboarding: React.FC = () => {
    const {setOnboarded} = useOnboardingStatus();
    const [currentStep, setCurrentStep] = useState(1);

    const handleComplete = async () => {
        await setOnboarded(true);
    };

    return (
        <div className='h-full px-14 pt-14'>
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
