import React, {useState} from 'react';
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

const Step1: React.FC<{onNext: () => void}> = ({onNext}) => (
    <div className='flex h-full flex-col gap-4 p-8'>
        <div className=''>
            <h2>Increase your reach, with the social web.</h2>
            <p>In addition to your website, email newsletter and RSS feeds, Ghost now shares posts to the social web – so millions of users across Flipboard, Mastodon, Threads, Bluesky and WordPress can find & follow your work.</p>
            <p>404Media is now part of the world’s largest open network.</p>
        </div>
        <div className='text-right'>
            <Button onClick={onNext}>Next</Button>
        </div>
    </div>
);

const Step2: React.FC<{onNext: () => void}> = ({onNext}) => (
    <div className='flex h-full flex-col gap-4 p-8'>
        <div>
            <h2>Feel the network effect.</h2>
            <p>People who follow you can like, reply, repost and interact with your posts. Their followers will see those interactions too, distributing your content even more widely, to a brand new audience.</p>
            <p>Best of all, you get realtime feedback and visibility when something you’ve created is spreading fast across the social web.</p>
        </div>
        <div className='text-right'>
            <Button onClick={onNext}>Next</Button>
        </div>
    </div>
);

const Onboarding: React.FC = () => {
    const {setOnboarded} = useOnboardingStatus();
    const [currentStep, setCurrentStep] = useState(3);

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
