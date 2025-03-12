import React, {useState} from 'react';
import {Button, H3} from '@tryghost/shade';
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
    <div className='relative h-full'>
        <div className='absolute inset-0 -mx-14 -mt-14 bg-[url(/ghost/assets/img/ap-nodes.png)] bg-cover bg-center bg-no-repeat' />
        <div className='relative flex justify-between'>
            <div className='flex flex-col gap-4 text-xl font-medium'>
                <h1 className='max-w-sm'>Increase your reach, with the social web.</h1>
                <div className='flex max-w-[600px] flex-col gap-4'>
                    <p className='text-gray-800 dark:text-gray-600'>In addition to your website, email newsletter and RSS feeds, Ghost now shares posts to the social web – so millions of users across Flipboard, Mastodon, Threads, Bluesky and WordPress can find & follow your work.</p>
                    <p><strong>404Media</strong> is now part of the world’s largest open network.</p>
                </div>
            </div>
            <Button className='min-w-60 bg-gradient-to-r from-purple-500 to-purple-600' size='lg' onClick={onNext}>Next →</Button>
        </div>
        <div className='relative w-96 rounded-md bg-white p-6 shadow-xl'>
            <img className='h-16 w-16 rounded-full' src="https://images.unsplash.com/profile-1725878289869-4e679a729355image?w=150&dpr=2&crop=faces&bg=%23fff&h=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" />
            <H3>The Utegaard</H3>
            <span className='text-lg font-medium'>@index@productmarketingalliance.com</span>
            <p className='leading-tight text-gray-800 dark:text-gray-600'>A website and newsletter about coffee—its culture, politics, and how it connects to the wider world.</p>
            <div>
                <div className='[&>*:nth-child(1)]:z-90 [&>*:nth-child(2)]:z-80 [&>*:nth-child(3)]:z-70 flex'>
                    <img className='relative h-5 w-5 rounded-full border border-white' src="https://images.unsplash.com/profile-1725878289869-4e679a729355image?w=150&dpr=2&crop=faces&bg=%23fff&h=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" />
                    <img className='relative -ml-2 h-5 w-5 rounded-full border border-white' src="https://images.unsplash.com/profile-1725878289869-4e679a729355image?w=150&dpr=2&crop=faces&bg=%23fff&h=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" />
                    <img className='relative -ml-2 h-5 w-5 rounded-full border border-white' src="https://images.unsplash.com/profile-1725878289869-4e679a729355image?w=150&dpr=2&crop=faces&bg=%23fff&h=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" />
                </div>
                Authored by Keith Moon and 2 others
            </div>
        </div>
    </div>
);

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

const Step3: React.FC<{onComplete: () => Promise<void>}> = ({onComplete}) => (
    <div className='relative h-full'>
        <div className='relative flex justify-between'>
            <div className='flex flex-col gap-4 text-xl font-medium'>
                <h1>Find inspiration & follow what you love.</h1>
                <div className='flex max-w-[600px] flex-col gap-4'>
                    <p className='text-gray-800 dark:text-gray-600'>Follow-back your community to connect with them directly, or subscribe to your peers for inspiration to fuel your next idea. You now have a native social web reader inside Ghost for keeping track of your favourite creators across different platforms. </p>
                </div>
            </div>
            <Button className='min-w-60 bg-gradient-to-r from-purple-500 to-purple-600' size='lg' onClick={onComplete}>Next →</Button>
        </div>
        <div className='mt-20'>
            Step 3 content
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
